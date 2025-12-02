import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { firestoreAdmin } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🔍 Avvio scansione catalogo Shopify 2...");

    // 1️⃣ Scarica TUTTI i prodotti
    const res = await shopify2(`/products.json?limit=250`);
    const products = res.products || [];

    console.log(`📦 Prodotti ottenuti: ${products.length}`);

    if (products.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Nessun prodotto trovato",
      });
    }

    // 2️⃣ Raccolta categorie
    const categories: Record<string, any[]> = {};

    for (const product of products) {
      const type = product.product_type?.trim() || "NO_TYPE";

      if (!categories[type]) categories[type] = [];
      categories[type].push(product);
    }

    console.log("📑 Categoria → prodotti:", Object.keys(categories));

    // 3️⃣ Controllo categorie che NON hanno un Blanks
    const missingBlanks: string[] = [];

    for (const type of Object.keys(categories)) {
      const normalized = type.toLowerCase();

      // Condizioni per considerare “BLANKS”
      const hasBlanks = normalized.includes("blank") || normalized.includes("blanks");

      if (!hasBlanks) {
        missingBlanks.push(type);
      }
    }

    // 4️⃣ Salvataggio su Firestore (chunk per evitare limite 1MB)
    const batch = firestoreAdmin.batch();
    const rootRef = firestoreAdmin.collection("shopify_catalog_scan");

    // Cancella vecchi dati
    const oldDocs = await rootRef.listDocuments();
    oldDocs.forEach((doc) => batch.delete(doc));

    // Aggiungi dati nuovi
    for (const [type, items] of Object.entries(categories)) {
      const docRef = rootRef.doc(type.replace(/\//g, "_"));

      batch.set(docRef, {
        type,
        count: items.length,
        products: items.map((p: any) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          product_type: p.product_type,
          tags: p.tags,
          status: p.status,
          variants: p.variants?.map((v: any) => ({
            id: v.id,
            title: v.title,
            option1: v.option1,
            option2: v.option2,
            inventory_quantity: v.inventory_quantity,
          })),
        })),
        updated_at: new Date().toISOString(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      total_products: products.length,
      categories: Object.keys(categories),
      missingBlanks,
      message: "Scansione completata e salvata su Firestore",
    });
  } catch (error: any) {
    console.error("❌ ERRORE SCAN CATALOGO:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}