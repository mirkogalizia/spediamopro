import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ Recupero mapping categorie → blanks
    const snapshot = await adminDb.collection("blanks_mapping").get();

    const activeBlanks: { blank_key: string; product_id: number }[] = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (d.blank_assigned && d.product_id) {
        activeBlanks.push({
          blank_key: d.blank_key,
          product_id: d.product_id,
        });
      }
    });

    if (activeBlanks.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Nessun blank da elaborare",
      });
    }

    const results: any[] = [];

    // 2️⃣ Per ogni blank, scarico varianti da Shopify
    for (const blank of activeBlanks) {
      const { blank_key, product_id } = blank;

      const url = `/products/${product_id}/variants.json`;
      const res = await shopify2(url);

      if (!res?.data?.variants) continue;

      const variants = res.data.variants;

      const stockRef = adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("inventory");

      const batch = adminDb.batch();

      for (const v of variants) {
        const taglia = (v.option1 || "NO_SIZE").toUpperCase().trim();
        const colore = (v.option2 || "NO_COLOR").toLowerCase().trim();

        const key = `${taglia}-${colore}`;

        const docRef = stockRef.doc(key);

        batch.set(docRef, {
          taglia,
          colore,
          stock: v.inventory_quantity,
          updated_at: new Date().toISOString(),
          variant_id: v.id,
        });
      }

      await batch.commit();

      results.push({
        blank_key,
        product_id,
        total_variants: variants.length,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Stock blanks generato su Firestore",
      processed: results,
    });
  } catch (err: any) {
    console.error("Errore build-blanks-stock:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}