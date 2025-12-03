// app/api/shopify2/catalog/assign-blanks-local/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("▶️ START assign-blanks (LOCAL - solo Firebase)");

    /* ------------------------------------------------------
       1️⃣ LOAD CATEGORY → BLANK MAPPING
    ------------------------------------------------------ */
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};

    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_key) {
        mapping[doc.id.toLowerCase().trim()] = d.blank_key;
      }
    });

    if (!Object.keys(mapping).length) {
      return NextResponse.json({
        ok: false,
        error: "❌ Nessun mapping trovato"
      });
    }

    console.log(`✅ Mappings caricati: ${Object.keys(mapping).length}`);

    /* ------------------------------------------------------
       2️⃣ LOAD BLANKS STOCK
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
       3️⃣ LOAD PRODUCTS FROM FIREBASE
    ------------------------------------------------------ */
    const productsSnap = await adminDb.collection("catalog_products").get();
    const products = productsSnap.docs.map(d => d.data());

    console.log(`✅ Prodotti caricati da Firebase: ${products.length}`);

    /* ------------------------------------------------------
       4️⃣ PROCESS & MATCH
    ------------------------------------------------------ */
    let batch = adminDb.batch();
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let counter = 0;

    const processed: any[] = [];
    const skipped: any[] = [];

    for (const p of products) {
      const category = (p.product_type || "").trim().toLowerCase();
      const blank_key = mapping[category];

      if (!blank_key) {
        skipped.push({
          product_id: p.id,
          reason: "no_blank_mapping",
          category
        });
        continue;
      }

      if (!p.variants || !Array.isArray(p.variants)) {
        skipped.push({
          product_id: p.id,
          reason: "no_variants"
        });
        continue;
      }

      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim(); // 🔥 Tutto minuscolo, come nei blank

        if (!size || !color) {
          skipped.push({
            variant_id: v.id,
            product_id: p.id,
            reason: "missing_size_or_color"
          });
          continue;
        }

        const blankVariantKey = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[blankVariantKey];

        if (!blankVariant) {
          skipped.push({
            variant_id: v.id,
            product_id: p.id,
            reason: "blank_variant_not_found",
            tried_key: blankVariantKey,
            blank_key
          });
          continue;
        }

        // 🎯 MATCH TROVATO!
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

        processed.push({
          variant_id: v.id,
          product_id: p.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id
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
    console.log(`⏳ Commit di ${batches.length} batches...`);

    for (const b of batches) {
      await b.commit();
    }

    console.log(`✅ Completato! Processed: ${processed.length}, Skipped: ${skipped.length}`);

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      skipped_count: skipped.length,
      processed: processed.slice(0, 50),
      skipped: skipped.slice(0, 30)
    });

  } catch (err: any) {
    console.error("❌ ERRORE assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
