// app/api/shopify2/catalog/assign-blanks-test/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("▶️ TEST assign-blanks - 1 prodotto");

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

    console.log("Mappings:", mapping);

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

    console.log("Blanks keys:", Object.keys(blanksMap));

    /* ------------------------------------------------------
       3️⃣ LOAD 1 PRODUCT - T-SHIRT
    ------------------------------------------------------ */
    const productSnap = await adminDb
      .collection("catalog_products")
      .doc("15315039060351") // ID del prodotto T-shirt che mi hai mostrato
      .get();

    if (!productSnap.exists) {
      return NextResponse.json({
        ok: false,
        error: "Prodotto test non trovato"
      });
    }

    const p = productSnap.data();
    console.log("Prodotto:", p?.title, "- Type:", p?.product_type);

    /* ------------------------------------------------------
       4️⃣ PROCESS
    ------------------------------------------------------ */
    const category = (p?.product_type || "").trim().toLowerCase();
    const blank_key = mapping[category];

    console.log("Category:", category, "→ Blank key:", blank_key);

    if (!blank_key) {
      return NextResponse.json({
        ok: false,
        error: `No blank mapping per categoria: ${category}`
      });
    }

    const processed: any[] = [];
    const skipped: any[] = [];

    // Testa solo le prime 5 varianti
    const testVariants = (p?.variants || []).slice(0, 5);

    for (const v of testVariants) {
      const size = (v.option1 || "").toUpperCase().trim();
      const color = (v.option2 || "").toLowerCase().trim();

      const blankVariantKey = `${size}-${color}`;
      const blankVariant = blanksMap[blank_key]?.[blankVariantKey];

      console.log(`Variante ${v.id}: ${size}-${color} → Blank trovato:`, !!blankVariant);

      if (!blankVariant) {
        skipped.push({
          variant_id: v.id,
          size,
          color,
          tried_key: blankVariantKey,
          reason: "blank_variant_not_found"
        });
        continue;
      }

      processed.push({
        variant_id: v.id,
        size,
        color,
        blank_variant_id: blankVariant.variant_id,
        will_write: true
      });
    }

    /* ------------------------------------------------------
       5️⃣ WRITE TO FIRESTORE (solo prime 5)
    ------------------------------------------------------ */
    const batch = adminDb.batch();

    for (const proc of processed) {
      const ref = adminDb
        .collection("graphics_blanks")
        .doc(String(proc.variant_id));

      batch.set(ref, {
        product_id: p?.id,
        variant_id_grafica: proc.variant_id,
        blank_key,
        blank_variant_id: proc.blank_variant_id,
        size: proc.size,
        color: proc.color,
        numero_grafica: null,
        updated_at: new Date().toISOString(),
        test: true
      });
    }

    await batch.commit();

    console.log("✅ Scritto su Firestore");

    return NextResponse.json({
      ok: true,
      product: {
        id: p?.id,
        title: p?.title,
        type: p?.product_type
      },
      category,
      blank_key,
      tested_variants: testVariants.length,
      processed_count: processed.length,
      skipped_count: skipped.length,
      processed,
      skipped,
      message: "Controlla Firebase Console → graphics_blanks"
    });

  } catch (err: any) {
    console.error("❌ ERRORE:", err);
    return NextResponse.json(
      { ok: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
