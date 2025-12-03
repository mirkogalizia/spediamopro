import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("▶️ START assign-blanks (DEBUG VERSION)");

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

    // 2️⃣ LOAD ALL PRODUCTS (single API)
    const productsRes = await shopify2.listProducts(250);
    const products = productsRes.products || [];

    // 3️⃣ LOAD BLANK STOCK
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

    // UTILITY: normalize type
    const normalizeType = (t: string = "") =>
      t
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/felpa\s*cappuccio/g, "felpa cappuccio")
        .replace(/hoodie/g, "felpa cappuccio")
        .replace(/t-?shirt/g, "t shirt")
        .replace(/t\s*shirt/g, "t shirt")
        .replace(/tee/g, "t shirt");

    // 4️⃣ PROCESSING & DEBUG
    const writes: FirebaseFirestore.WriteBatch[] = [];
    let batch = adminDb.batch();
    let batchCounter = 0;

    const processed = [];
    const skipped = [];

    for (const p of products) {
      const rawType = p.product_type || "";
      const type = normalizeType(rawType);
      const blank_key = mapping[type];

      if (!blank_key) {
        skipped.push({
          product_id: p.id,
          reason: "NO_MAPPING",
          rawType,
          normalizedType: type,
        });
        continue;
      }

      // Load metafields (OLD LOGIC THAT WORKED)
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
        skipped.push({
          product_id: p.id,
          reason: "META_API_FAIL",
          error: `${err}`,
        });
      }

      // Process variants
      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();

        if (!size || !color) {
          skipped.push({
            product_id: p.id,
            variant_id: v.id,
            reason: "MISSING_SIZE_OR_COLOR",
            size,
            color,
          });
          continue;
        }

        const blankVariantKey = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[blankVariantKey];

        if (!blankVariant) {
          skipped.push({
            product_id: p.id,
            variant_id: v.id,
            reason: "BLANK_VARIANT_NOT_FOUND",
            blank_key,
            expected_key: blankVariantKey,
            available_keys: Object.keys(blanksMap[blank_key] || {}),
          });
          continue;
        }

        const numero_grafica = metafieldsMap[v.id] || null;

        const ref = adminDb.collection("graphics_blanks").doc(String(v.id));

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
          product_id: p.id,
          variant_id: v.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
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

    for (const b of writes) {
      await b.commit();
    }

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      skipped_count: skipped.length,
      processed,
      skipped,
    });

  } catch (err: any) {
    console.error("❌ assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}