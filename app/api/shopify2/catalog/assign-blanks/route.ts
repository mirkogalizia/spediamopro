import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------
   🚀 1️⃣ QUERY BULK PER PRENDERE TUTTI I DATI
------------------------------------------------------ */
const BULK_QUERY = `
{
  products(first: 250) {
    edges {
      node {
        id
        productType
        variants(first: 250) {
          edges {
            node {
              id
              title
              selectedOptions {
                name
                value
              }
              metafields(namespace:"custom", keys:["numero_grafica"]) {
                key
                value
              }
            }
          }
        }
      }
    }
  }
}
`;

async function runBulk() {
  const res = await shopify2.graphql(`
    mutation {
      bulkOperationRunQuery(
        query: """${BULK_QUERY}"""
      ) {
        bulkOperation {
          id
          status
        }
        userErrors { field message }
      }
    }
  `);

  if (res.userErrors?.length) {
    throw new Error("Bulk run error: " + JSON.stringify(res.userErrors));
  }

  return res.bulkOperation.id;
}

async function waitBulkResult() {
  while (true) {
    const statusRes = await shopify2.graphql(`
      {
        currentBulkOperation {
          id
          status
          url
          errorCode
        }
      }
    `);

    const op = statusRes.currentBulkOperation;

    if (!op || !op.status) throw new Error("Bulk op missing");

    if (op.status === "COMPLETED") return op.url;
    if (op.status === "FAILED") throw new Error("Bulk failed");

    await new Promise(r => setTimeout(r, 1500));
  }
}

/* ------------------------------------------------------
   🚀 2️⃣ MAIN
------------------------------------------------------ */
export async function POST() {
  try {
    console.log("▶️ START BULK + ASSIGN BLANKS");

    // STEP 1 → avvia bulk
    const opId = await runBulk();
    console.log("📦 Bulk operation ID:", opId);

    // STEP 2 → aspetta il risultato
    const url = await waitBulkResult();
    console.log("📥 Bulk result URL ricevuto");

    // STEP 3 → scarica JSONL
    const raw = await (await fetch(url)).text();
    const lines = raw.trim().split("\n").map(l => JSON.parse(l));

    console.log(`📦 Prodotti caricati dal bulk: ${lines.length}`);

    // STEP 4 → carica mapping e blanks
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping = {};
    mappingSnap.forEach(d => mapping[d.id] = d.data().blank_key);

    const blanksSnap = await adminDb.collection("blanks_stock").get();
    const blanksMap = {};

    for (const blankDoc of blanksSnap.docs) {
      const blank_key = blankDoc.id;
      blanksMap[blank_key] = {};

      const variantsSnap = await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("variants")
        .get();

      variantsSnap.forEach(v => {
        blanksMap[blank_key][v.id] = v.data();
      });
    }

    console.log("🧱 Blanks caricati:", Object.keys(blanksMap).length);

    // STEP 5 → processa tutto
    let batch = adminDb.batch();
    const batches = [];
    let counter = 0;

    const processed = [];
    const skipped = [];

    for (const product of lines) {
      const category = product.productType?.trim().toLowerCase() || "no_type";
      const blank_key = mapping[category];

      if (!blank_key) {
        skipped.push({ product: product.id, reason: "no_blank_mapping" });
        continue;
      }

      for (const v of product.variants.edges) {
        const variant = v.node;

        const size = variant.selectedOptions.find(o => o.name === "Taglia")?.value?.toUpperCase();
        const color = variant.selectedOptions.find(o => o.name === "Colore")?.value?.toLowerCase();

        if (!size || !color) {
          skipped.push({ variant: variant.id, reason: "missing_size_or_color" });
          continue;
        }

        const key = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[key];

        if (!blankVariant) {
          skipped.push({ variant: variant.id, reason: "blank_variant_not_found", tried: key });
          continue;
        }

        const numero_grafica = variant.metafields?.[0]?.value || null;

        const ref = adminDb.collection("graphics_blanks").doc(variant.id.replace("gid://shopify/ProductVariant/", ""));

        batch.set(ref, {
          product_id: product.id,
          variant_id_grafica: variant.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
          size,
          color,
          numero_grafica,
          updated_at: new Date().toISOString(),
        });

        processed.push({ variant: variant.id, blank_key });

        counter++;
        if (counter >= 480) {
          batches.push(batch);
          batch = adminDb.batch();
          counter = 0;
        }
      }
    }

    if (counter > 0) batches.push(batch);

    // STEP 6 → commit batches
    for (const b of batches) await b.commit();

    console.log("✅ COMPLETATO");

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      skipped_count: skipped.length,
      processed: processed.slice(0, 30),
      skipped: skipped.slice(0, 30),
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}