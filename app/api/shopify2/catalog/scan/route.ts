// app/api/shopify2/catalog/scan/route.ts
import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Scarica tutti i prodotti
    const res = await shopify2.api("/products.json?limit=250");

    const products = res.products || [];

    const categories = new Set<string>();

    for (const p of products) {
      const type = (p.product_type || "no_type").toLowerCase().trim();
      categories.add(type);

      await adminDb.collection("catalog_products")
        .doc(String(p.id))
        .set({
          id: p.id,
          title: p.title,
          product_type: type,
          handle: p.handle,
          status: p.status,
          variants: p.variants || [],
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      ok: true,
      total_products: products.length,
      categories: [...categories],
      missingBlanks: [...categories],
      message: "Scansione completata e salvata su Firestore",
    });

  } catch (err: any) {
    console.error("❌ Errore catalog scan:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}