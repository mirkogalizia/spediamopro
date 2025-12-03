// app/api/shopify2/catalog/assign-blanks-test/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("▶️ START assign-blanks-test - TUTTI I PRODOTTI");

    /* ------------------------------------------------------
       1️⃣ LOAD MAPPINGS
    ------------------------------------------------------ */
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};

    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_key) {
        mapping[doc.id.toLowerCase().trim()] = d.blank_key;
      }
    });

    console.log("✅ Mappings caricati:", Object.keys(mapping).length);

    /* ------------------------------------------------------
       2️⃣ LOAD BLANKS
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

    console.log("✅ Blanks caricati:", Object.keys(blanksMap).length);

    /* ------------------------------------------------------
       3️⃣ LOAD ALL PRODUCTS
    ------------------------------------------------------ */
    const productsSnap = await adminDb.collection("catalog_products").get();
    const products = productsSnap.docs.map(d => d.data());

    console.log("✅ Prodotti caricati:", products.length);

    /* ------------------------------------------------------
       4️⃣ PROCESS ALL
    ------------------------------------------------------ */
    let batch = adminDb.batch();
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let counter = 0;

    let processedCount = 0;
    let skippedCount = 0;

    for (const p of products) {
      const category = (p.product_type || "").trim().toLowerCase();
      const blank_key = mapping[category];

      if (!blank_key) {
        skippedCount++;
        continue;
      }

      if (!p.variants || !Array.isArray(p.variants)) {
        skippedCount++;
        continue;
      }

      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();

        if (!size || !color) {
          skippedCount++;
          continue;
        }

        const blankVariantKey = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[blankVariantKey];

        if (!blankVariant) {
          skippedCount++;
          continue;
        }

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
          numero_grafica: v.numero_grafica || null,
          updated_at: new Date().toISOString()
        });

        processedCount++;
        counter++;

        if (counter >= 450) {
          batches.push(batch);
          batch = adminDb.batch();
          counter = 0;
          console.log(`📦 Batch preparato (${batches.length})`);
        }
      }
    }

    if (counter > 0) batches.push(batch);

    console.log(`⏳ Commit di ${batches.length} batches...`);

    /* ------------------------------------------------------
       5️⃣ COMMIT ALL BATCHES
    ------------------------------------------------------ */
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`✅ Batch ${i + 1}/${batches.length} committato`);
    }

    console.log("✅ COMPLETATO!");

    return NextResponse.json({
      ok: true,
      total_products: products.length,
      processed_count: processedCount,
      skipped_count: skippedCount,
      batches_written: batches.length,
      message: "✅ Tutti i prodotti processati! Controlla Firebase → graphics_blanks"
    });

  } catch (err: any) {
    console.error("❌ ERRORE:", err);
    return NextResponse.json(
      { ok: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
