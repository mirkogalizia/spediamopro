import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ LOAD BLANKS MAPPING
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};
    mappingSnap.forEach((d) => {
      const data = d.data();
      if (data.blank_key) mapping[d.id] = data.blank_key;
    });

    if (Object.keys(mapping).length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Nessun mapping categoria → blank."
      });
    }

    // 2️⃣ LOAD ALL PRODUCTS (1 single Shopify API)
    const productsRes = await shopify2.listProducts(250);
    const products = productsRes.products || [];

    // 3️⃣ LOAD BLANK STOCK (1 Firestore query)
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

    // 4️⃣ PROCESS EVERYTHING IN MEMORY
    const writes: FirebaseFirestore.WriteBatch[] = [];
    let batch = adminDb.batch();
    let batchCounter = 0;

    const processed = [];

    for (const p of products) {
      const category = p.product_type?.trim().toLowerCase() || "no_type";

      const blank_key = mapping[category];
      if (!blank_key) continue;

      // 4b: metafields IN BULK (1 call per product)
      let metafieldsMap: Record<number, any> = {};
      try {
        const metaRes = await shopify2.api(`/products/${p.id}/metafields.json`);
        const list = metaRes.metafields || [];

        for (const m of list) {
          if (m.owner_resource === "variant" &&
              m.namespace === "custom" &&
              m.key === "numero_grafica") 
          {
            metafieldsMap[m.owner_id] = m.value;
          }
        }
      } catch {}

      // 4c: PROCESS VARIANTS
      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();
        const blankVariantKey = `${size}-${color}`;

        const blankVariant = blanksMap[blank_key]?.[blankVariantKey];
        if (!blankVariant) continue;

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
          blank_key,
          blank_variant: blankVariant.variant_id
        });

        batchCounter++;
        if (batchCounter >= 480) {
          writes.push(batch);
          batch = adminDb.batch();
          batchCounter = 0;
        }
      }
    }

    if (batchCounter > 0) writes.push(batch);

    // 5️⃣ EXECUTE BATCHES (FAST)
    for (const b of writes) {
      await b.commit();
    }

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      processed
    });
  } catch (err: any) {
    console.error("❌ assign-blanks:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}