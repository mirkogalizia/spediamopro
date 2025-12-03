import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------
   🔧 Utility per delay
------------------------------------------------------ */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      const wait = 1000 + attempt * 500;
      console.warn(`⚠️ Shopify 429, retry in ${wait}ms (${attempt + 1}/${MAX_RETRIES})`);
      await delay(wait);
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

    console.log(`✅ Mappings caricati: ${Object.keys(mapping).length}`);

    /* ------------------------------------------------------
       2️⃣ LOAD ALL PRODUCTS (1 API CALL)
    ------------------------------------------------------ */
    const productsRes = await shopifySafeRequest("/products.json?limit=250");
    const products = productsRes.products || [];

    console.log(`✅ Prodotti caricati: ${products.length}`);

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

    console.log(`✅ Blanks caricati: ${Object.keys(blanksMap).length}`);

    /* ------------------------------------------------------
       4️⃣ CARICA TUTTI I METAFIELDS UNA VOLTA SOLA (CON DELAY)
    ------------------------------------------------------ */
    const allMetafieldsMap: Record<number, any> = {};

    console.log("⏳ Caricamento metafields in corso...");

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      try {
        const metaRes = await shopifySafeRequest(`/products/${p.id}/metafields.json`);
        const metaList = metaRes.metafields || [];

        for (const m of metaList) {
          if (
            m.owner_resource === "variant" &&
            m.namespace === "custom" &&
            m.key === "numero_grafica"
          ) {
            allMetafieldsMap[m.owner_id] = m.value;
          }
        }

        // 🔥 DELAY 550ms tra ogni chiamata per rispettare il limite di 2 req/sec
        if (i < products.length - 1) {
          await delay(550);
        }

        // Log progresso ogni 10 prodotti
        if ((i + 1) % 10 === 0) {
          console.log(`   📦 Metafields: ${i + 1}/${products.length}`);
        }

      } catch (err) {
        console.warn(`⚠️ Metafields falliti per prodotto ${p.id}`);
      }
    }

    console.log(`✅ Metafields caricati per ${Object.keys(allMetafieldsMap).length} varianti`);

    /* ------------------------------------------------------
       5️⃣ PROCESS PRODUCTS & VARIANTS
    ------------------------------------------------------ */
    let batch = adminDb.batch();
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let counter = 0;

    const processed: any[] = [];
    const skipped: any[] = [];

    for (const p of products) {
      const category = p.product_type?.trim().toLowerCase() || "no_type";
      const blank_key = mapping[category];

      if (!blank_key) {
        skipped.push({ product_id: p.id, reason: "no_blank_mapping", category });
        continue;
      }

      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();

        if (!size || !color) {
          skipped.push({ 
            variant_id: v.id, 
            product_id: p.id, 
            reason: "missing_size_or_color" 
          });
          continue;
        }

        const key = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[key];

        if (!blankVariant) {
          skipped.push({
            variant_id: v.id,
            product_id: p.id,
            reason: "blank_variant_not_found",
            tried_key: key,
          });
          continue;
        }

        const numero_grafica = allMetafieldsMap[v.id] || null;

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
       6️⃣ COMMIT BATCHES
    ------------------------------------------------------ */
    console.log(`⏳ Commit di ${batches.length} batches...`);

    for (const b of batches) {
      await b.commit();
    }

    console.log("✅ Assign-blanks completato");

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      skipped_count: skipped.length,
      processed: processed.slice(0, 50), // primi 50 per non sovraccaricare la risposta
      skipped: skipped.slice(0, 20), // primi 20 skipped
      total_metafields_loaded: Object.keys(allMetafieldsMap).length,
    });

  } catch (err: any) {
    console.error("❌ ERRORE assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
