import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------
   🔧 Utility Shopify con retry anti-429
------------------------------------------------------ */
async function shopifySafeRequest(path: string, method: "GET" | "POST" = "GET") {
  const MAX_RETRIES = 6;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      return await shopify2.api(path, method);
    } catch (err: any) {
      const is429 = err?.status === 429;
      if (!is429) throw err;

      // Rate limit → aspetta e riprova
      const wait = 300 + attempt * 400;
      console.warn(`⚠️ Shopify 429, retry in ${wait}ms (${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(res => setTimeout(res, wait));
      attempt++;
    }
  }

  throw new Error(`Shopify API failed after ${MAX_RETRIES} retries: ${path}`);
}


/* ------------------------------------------------------
   🚀 MAIN LOGIC
------------------------------------------------------ */
export async function POST() {
  try {
    console.log("▶️ START assign-blanks");

    /* ------------------------------------------------------
       1️⃣ LOAD CATEGORY → BLANK KEY MAPPING
    ------------------------------------------------------ */
    const mappingSnap = await adminDb.collection("blanks_mapping").get();

    const mapping: Record<string, string> = {};
    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_key) mapping[doc.id] = d.blank_key;
    });

    if (!Object.keys(mapping).length) {
      return NextResponse.json({
        ok: false,
        error: "❌ Nessun mapping categoria → blank trovato in Firestore.",
      });
    }

    /* ------------------------------------------------------
       2️⃣ LOAD ALL PRODUCTS (1 API CALL)
    ------------------------------------------------------ */
    const productsRes = await shopifySafeRequest("/products.json?limit=250");
    const products = productsRes.products || [];

    /* ------------------------------------------------------
       3️⃣ LOAD BLANKS STOCK (FIRESTORE)
    ------------------------------------------------------ */
    const blanksSnap = await adminDb.collection("blanks_stock").get();
    const blanksMap: Record<string, Record<string, any>> = {};

    for (const blankDoc of blanksSnap.docs) {
      const blank_key = blankDoc.id;
      blanksMap[blank_key] = {};

      const variantsSnap = await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("variants")
        .get();

      variantsSnap.forEach((v) => {
        blanksMap[blank_key][v.id] = v.data();
      });
    }

    /* ------------------------------------------------------
       4️⃣ PROCESS PRODUCTS
    ------------------------------------------------------ */
    let batch = adminDb.batch();
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let counter = 0;

    const processed: any[] = [];

    for (const p of products) {
      const category = p.product_type?.trim().toLowerCase() || "no_type";
      const blank_key = mapping[category];

      if (!blank_key) continue;

      /* ------------------------------------------------------
         4a️⃣ LOAD METAFIELDS (1 CALL / PRODUCT)
      ------------------------------------------------------ */
      let metafieldsMap: Record<number, any> = {};

      try {
        const metaRes = await shopifySafeRequest(`/products/${p.id}/metafields.json`);
        const metaList = metaRes.metafields || [];

        for (const m of metaList) {
          if (
            m.owner_resource === "variant" &&
            m.namespace === "custom" &&
            m.key === "numero_grafica"
          ) {
            metafieldsMap[m.owner_id] = m.value;
          }
        }
      } catch (err) {
        console.warn(`⚠️ Metafields falliti per prodotto ${p.id}`);
      }

      /* ------------------------------------------------------
         4b️⃣ PROCESSA VARIANTI
      ------------------------------------------------------ */
      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();

        const key = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[key];

        if (!blankVariant) {
          continue;
        }

        const numero_grafica = metafieldsMap[v.id] || null;

        const ref = adminDb
          .collection("graphics_blanks")
          .doc(String(v.id));

        batch.set(ref, {
          product_id: p.id,
          variant_id_grafica: v.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
          size,
          color,
          numero_grafica,
          updated_at: new Date().toISOString(),
        });

        processed.push({
          variant_id: v.id,
          product_id: p.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
        });

        counter++;
        if (counter >= 480) {
          batches.push(batch);
          batch = adminDb.batch();
          counter = 0;
        }
      }
    }

    if (counter > 0) batches.push(batch);

    /* ------------------------------------------------------
       5️⃣ COMMIT BATCHES
    ------------------------------------------------------ */
    for (const b of batches) {
      await b.commit();
    }

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      processed,
    });
  } catch (err: any) {
    console.error("❌ ERRORE assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}