// app/api/shopify2/catalog/assign-blanks/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

// 💡 GraphQL query completa
const QUERY = `
  query fetchProducts($cursor: String) {
    products(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          productType
          title
          variants(first: 100) {
            edges {
              node {
                id
                title
                selectedOptions { name value }
                metafields(namespace: "custom", keys: ["numero_grafica"]) {
                  key
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function GET() {
  console.log("▶️ START assign-blanks BULK");

  try {
    // 1) Load category → blank mapping
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};
    mappingSnap.forEach((d) => {
      const key = d.id.toLowerCase().trim();
      mapping[key] = d.data().blank_key;
    });

    if (!Object.keys(mapping).length)
      return NextResponse.json({ ok: false, error: "No blanks mapping" });

    // 2) Load blanks stock
    const blanksSnap = await adminDb.collection("blanks_stock").get();
    const blanks: Record<string, Record<string, any>> = {};

    for (const doc of blanksSnap.docs) {
      const key = doc.id;
      blanks[key] = {};

      const vSnap = await doc.ref.collection("variants").get();
      vSnap.forEach((v) => {
        blanks[key][v.id] = v.data();
      });
    }

    // 3) Fetch ALL products in bulk (no rate limit)
    let cursor: string | null = null;
    const allProducts: any[] = [];

    do {
      const res = await shopify2.graphql(QUERY, { cursor });

      const edges = res.data.products.edges;
      edges.forEach((e: any) => allProducts.push(e.node));

      cursor = res.data.products.pageInfo.hasNextPage
        ? res.data.products.pageInfo.endCursor
        : null;
    } while (cursor);

    console.log("📦 Total products loaded:", allProducts.length);

    // 4) Process & write to Firestore
    let batch = adminDb.batch();
    const batches: any[] = [];
    let count = 0;

    for (const p of allProducts) {
      const type = (p.productType || "").trim().toLowerCase();
      const blank_key = mapping[type];
      if (!blank_key) continue;

      for (const ve of p.variants.edges) {
        const v = ve.node;

        // Extract size/color
        const sizeOpt = v.selectedOptions.find((o: any) =>
          ["taglia", "size"].includes(o.name.toLowerCase())
        );
        const colorOpt = v.selectedOptions.find((o: any) =>
          ["colore", "color"].includes(o.name.toLowerCase())
        );

        if (!sizeOpt || !colorOpt) continue;

        const size = sizeOpt.value.toUpperCase();
        const color = colorOpt.value.toLowerCase();

        const blankVarKey = `${size}-${color}`;
        const blankVariant = blanks[blank_key]?.[blankVarKey];
        if (!blankVariant) continue;

        const numero_grafica =
          v.metafields?.[0]?.value || null;

        const variantId = v.id.replace("gid://shopify/ProductVariant/", "");
        const productId = p.id.replace("gid://shopify/Product/", "");

        const ref = adminDb
          .collection("graphics_blanks")
          .doc(variantId);

        batch.set(ref, {
          product_id: productId,
          product_type: type,
          variant_id_grafica: variantId,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
          size,
          color,
          numero_grafica,
          updated_at: new Date().toISOString()
        });

        count++;

        if (count % 400 === 0) {
          batches.push(batch);
          batch = adminDb.batch();
        }
      }
    }

    batches.push(batch);

    for (const b of batches) await b.commit();

    console.log("✅ Assigned:", count);

    return NextResponse.json({
      ok: true,
      assigned: count
    });
  } catch (err: any) {
    console.error("❌ assign-blanks ERROR", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}