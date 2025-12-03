// app/api/shopify2/catalog/assign-blanks-batch/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const startIndex = body.startIndex || 0;
    const batchSize = 5; // 🔥 5 prodotti alla volta

    console.log(`▶️ Batch ${Math.floor(startIndex / batchSize) + 1} - Starting at index ${startIndex}`);

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

    /* ------------------------------------------------------
       3️⃣ LOAD PRODUCTS
    ------------------------------------------------------ */
    const productsSnap = await adminDb.collection("catalog_products").get();
    const allProducts = productsSnap.docs.map(d => d.data());

    const batchProducts = allProducts.slice(startIndex, startIndex + batchSize);
    const totalProducts = allProducts.length;
    const hasMore = (startIndex + batchSize) < totalProducts;

    console.log(`Processing ${batchProducts.length} products (${startIndex + 1} to ${startIndex + batchProducts.length} of ${totalProducts})`);

    if (batchProducts.length === 0) {
      return NextResponse.json({
        ok: true,
        done: true,
        message: "✅ Tutti i prodotti processati!",
        totalProducts
      });
    }

    /* ------------------------------------------------------
       4️⃣ PROCESS BATCH
    ------------------------------------------------------ */
    let batch = adminDb.batch();
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let counter = 0;

    let processedCount = 0;
    let skippedCount = 0;

    for (const p of batchProducts) {
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

        if (counter >= 480) {
          batches.push(batch);
          batch = adminDb.batch();
          counter = 0;
        }
      }
    }

    if (counter > 0) batches.push(batch);

    /* ------------------------------------------------------
       5️⃣ COMMIT
    ------------------------------------------------------ */
    for (const b of batches) {
      await b.commit();
    }

    console.log(`✅ Batch completed: ${processedCount} processed, ${skippedCount} skipped`);

    /* ------------------------------------------------------
       6️⃣ RETURN
    ------------------------------------------------------ */
    return NextResponse.json({
      ok: true,
      done: !hasMore,
      currentBatch: Math.floor(startIndex / batchSize) + 1,
      totalBatches: Math.ceil(totalProducts / batchSize),
      processedInBatch: processedCount,
      skippedInBatch: skippedCount,
      nextStartIndex: hasMore ? startIndex + batchSize : null,
      progress: `${Math.min(startIndex + batchSize, totalProducts)}/${totalProducts}`,
      message: hasMore 
        ? `Batch completato. Prossimo: ${startIndex + batchSize}` 
        : "✅ Tutti i prodotti processati!"
    });

  } catch (err: any) {
    console.error("❌ ERRORE batch:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
