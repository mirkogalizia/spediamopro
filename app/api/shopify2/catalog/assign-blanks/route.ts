import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ LOAD CATEGORY → BLANK MAPPING
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};

    mappingSnap.forEach((d) => {
      const data = d.data();
      if (data.blank_key) mapping[d.id] = data.blank_key;
    });

    if (Object.keys(mapping).length === 0) {
      return NextResponse.json({ ok: false, error: "Nessun mapping categoria → blank." });
    }

    // 2️⃣ LOAD ALL PRODUCTS (ONE CALL)
    const productsRes = await shopify2.listProducts(250);
    const products = productsRes.products || [];

    // 3️⃣ LOAD ALL BLANK STOCK (FIRESTORE)
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

    // 4️⃣ PROCESS ALL PRODUCTS
    const writes: FirebaseFirestore.WriteBatch[] = [];
    let batch = adminDb.batch();
    let batchCounter = 0;

    const processed = [];

    for (const p of products) {
      const category = (p.product_type || "").trim().toLowerCase();
      const blank_key = mapping[category];

      // 👉 Non saltare tutto il prodotto: se non ha blank, passa al prossimo
      if (!blank_key) continue;

      // 4B: GET ALL METAFIELDS OF THE PRODUCT (1 CALL)
      let metafieldsMap: Record<number, any> = {};

      try {
        const metaRes = await shopify2.api(`/products/${p.id}/metafields.json`);
        const list = metaRes.metafields || [];

        for (const m of list) {
          if (
            m.owner_resource === "variant" &&
            m.namespace === "custom" &&
            m.key === "numero_grafica"
          ) {
            metafieldsMap[m.owner_id] = m.value;
          }
        }
      } catch (err) {
        // Se fallisce, NON blocca il flusso
      }

      // 4C: PROCESS EACH VARIANT → MATCH ONLY EXISTING BLANKS
      for (const v of p.variants) {
        const rawSize = (v.option1 || "").trim().toUpperCase();
        const rawColor = (v.option2 || "").trim().toLowerCase();

        if (!rawSize || !rawColor) continue;

        const blankVariantKey = `${rawSize}-${rawColor}`;
        const blankVariant = blanksMap[blank_key]?.[blankVariantKey];

        // 👉 Se il blank specifico non esiste, NON saltare il prodotto → passa alla prossima variante
        if (!blankVariant) continue;

        const numero_grafica = metafieldsMap[v.id] || null;

        const ref = adminDb.collection("graphics_blanks").doc(String(v.id));

        batch.set(ref, {
          product_id: p.id,
          variant_id_grafica: v.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
          size: rawSize,
          color: rawColor,
          numero_grafica,
          updated_at: new Date().toISOString(),
        });

        processed.push({
          variant_id: v.id,
          blank_key,
          blank_variant: blankVariant.variant_id,
        });

        batchCounter++;
        if (batchCounter >= 450) {
          writes.push(batch);
          batch = adminDb.batch();
          batchCounter = 0;
        }
      }
    }

    // 5️⃣ EXECUTE ALL BATCH WRITES
    if (batchCounter > 0) writes.push(batch);
    for (const b of writes) await b.commit();

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      processed
    });

  } catch (err: any) {
    console.error("❌ assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}