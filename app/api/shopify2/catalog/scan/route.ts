import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ Scarica TUTTI i prodotti dal secondo store
    const res = await shopify2.api("products.json?limit=250");

    const products = res?.products || [];

    console.log("📦 Prodotti ottenuti:", products.length);

    // 2️⃣ Crea lista categorie
    const categories: Record<string, any[]> = {};

    for (const product of products) {
      const type =
        product.product_type?.trim().toLowerCase() || "no_type";

      if (!categories[type]) categories[type] = [];

      categories[type].push({
        id: product.id,
        title: product.title,
        handle: product.handle,
      });
    }

    // 3️⃣ Categorie senza blanks
    const missing: string[] = Object.keys(categories);

    // 4️⃣ Salvo tutto in Firestore
    const batch = adminDb.batch();
    const colRef = adminDb.collection("catalog_scan");

    // elimino vecchia struttura
    const oldSnap = await colRef.get();
    oldSnap.forEach((doc) => batch.delete(doc.ref));

    for (const type of Object.keys(categories)) {
      batch.set(colRef.doc(type), {
        type,
        total: categories[type].length,
        products: categories[type],
        updated_at: new Date().toISOString(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      total_products: products.length,
      categories: Object.keys(categories),
      missingBlanks: missing,
      message: "Scansione completata e salvata su Firestore",
    });
  } catch (err: any) {
    console.error("❌ Errore catalog scan:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}