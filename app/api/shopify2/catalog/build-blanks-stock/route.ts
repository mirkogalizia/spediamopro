import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🚀 Avvio build-blanks-stock…");

    // 1️⃣ Leggo mapping categorie → product_id blank
    const snapshot = await adminDb.collection("blanks_mapping").get();

    const items: { blank_key: string; product_id: number }[] = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      if (d.blank_assigned && d.product_id) {
        items.push({
          blank_key: d.blank_key,
          product_id: d.product_id,
        });
      }
    });

    if (items.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Nessun blank mappato",
      });
    }

    const results: any[] = [];

    // 2️⃣ Ciclo ogni blank
    for (const item of items) {
      const { blank_key, product_id } = item;

      console.log(`📦 Scarico varianti per: ${blank_key} (ID: ${product_id})`);

      // Shopify call
      const res = await shopify2.getProduct(product_id);
      if (!res?.product?.variants) {
        console.log(`❌ Nessuna variante trovata per ${product_id}`);
        continue;
      }

      const variants = res.product.variants;

      // 🔥 AGGIUNTO: Scrivi il documento padre
      await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .set({
          product_id: product_id,
          name: blank_key,
          last_sync: new Date().toISOString(),
          total_variants: variants.length,
        });

      // 3️⃣ Path Firestore: blanks_stock/{blank_key}/variants/*
      const variantsRef = adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("variants");

      // 4️⃣ Cancello vecchie varianti
      const old = await variantsRef.get();
      const batchDelete = adminDb.batch();
      old.forEach((d) => batchDelete.delete(d.ref));
      await batchDelete.commit();

      // 5️⃣ Inserisco aggiornate
      const batch = adminDb.batch();

      for (const v of variants) {
        const taglia = (v.option1 || "NO_SIZE").toUpperCase().trim();
        const colore = (v.option2 || "NO_COLOR").toLowerCase().trim();
        const key = `${taglia}-${colore}`;

        const ref = variantsRef.doc(key);

        batch.set(ref, {
          taglia,
          colore,
          stock: v.inventory_quantity || 0,
          variant_id: v.id,
          updated_at: new Date().toISOString(),
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
      message: "Blanks stock aggiornato correttamente",
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
