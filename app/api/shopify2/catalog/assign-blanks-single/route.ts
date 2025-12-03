// app/api/shopify2/catalog/assign-blanks-single/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { productId } = await request.json();

    console.log(`▶️ Processing product: ${productId}`);

    /* LOAD MAPPINGS */
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};

    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_key) {
        mapping[doc.id.toLowerCase().trim()] = d.blank_key;
      }
    });

    /* LOAD BLANKS */
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

    /* LOAD SINGLE PRODUCT */
    const productSnap = await adminDb
      .collection("catalog_products")
      .doc(String(productId))
      .get();

    if (!productSnap.exists) {
      return NextResponse.json({
        ok: false,
        error: `Product ${productId} not found`
      }, { status: 404 });
    }

    const p = productSnap.data();

    /* PROCESS THIS PRODUCT */
    const category = (p?.product_type || "").trim().toLowerCase();
    const blank_key = mapping[category];

    if (!blank_key) {
      return NextResponse.json({
        ok: true,
        productId,
        processed: 0,
        skipped: 0,
        message: `No blank mapping for category: ${category}`
      });
    }

    let processedCount = 0;
    let skippedCount = 0;

    const batch = adminDb.batch();

    for (const v of (p?.variants || [])) {
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

      const ref = adminDb.collection("graphics_blanks").doc(String(v.id));
      batch.set(ref, {
        product_id: p?.id,
        variant_id_grafica: v.id,
        blank_key,
        blank_variant_id: blankVariant.variant_id,
        size,
        color,
        numero_grafica: v.numero_grafica || null,
        updated_at: new Date().toISOString()
      });

      processedCount++;
    }

    await batch.commit();

    console.log(`✅ Product ${productId}: ${processedCount} processed, ${skippedCount} skipped`);

    return NextResponse.json({
      ok: true,
      productId,
      title: p?.title,
      processed: processedCount,
      skipped: skippedCount
    });

  } catch (err: any) {
    console.error("❌ ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/* GET: Returns list of all product IDs */
export async function GET() {
  try {
    const productsSnap = await adminDb.collection("catalog_products").get();
    const productIds = productsSnap.docs.map(d => d.id);

    return NextResponse.json({
      ok: true,
      count: productIds.length,
      productIds
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
