import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ Leggo la mappatura categorie → blanks
    const snapshot = await adminDb.collection("blanks_mapping").get();

    const activeBlanks: { blank_key: string; product_id: number }[] = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (d.blank_assigned && d.product_id && d.blank_key) {
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

    // 2️⃣ Per ogni blank → scarico varianti da Shopify
    for (const blank of activeBlanks) {
      const { blank_key, product_id } = blank;

      // CORRETTO: niente slash iniziale, uso shopify2.api
      const response = await shopify2.api(
        `products/${product_id}/variants.json`
      );

      const variants = response?.variants;

      if (!variants || variants.length === 0) {
        console.log(`⚠️ Nessuna variante trovata per prodotto ${product_id}`);
        continue;
      }

      // 3️⃣ Scrivo nel Firestore
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
          stock: v.inventory_quantity ?? 0,
          variant_id: v.id,
          inventory_item_id: v.inventory_item_id ?? null,
          updated_at: new Date().toISOString(),
        });
      }

      await batch.commit();

      results.push({
        blank_key,
        product_id,
        total_variants: variants.length,
      });

      console.log(
        `✔️ BLANK ${blank_key} aggiornato — ${variants.length} varianti`
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Stock blanks generato correttamente",
      processed: results,
    });
  } catch (err: any) {
    console.error("❌ Errore build-blanks-stock:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}