// app/api/shopify2/catalog/build-blanks-stock/route.ts
import { NextResponse } from "next/server";
import { shopify2 } from "@/lib/shopify2";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await adminDb.collection("blanks_mapping").get();

    const blanks = [];
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_assigned && d.product_id) blanks.push(d);
    });

    const processed = [];

    for (const b of blanks) {
      const { blank_key, product_id } = b;

      // Scarica il prodotto con TUTTE le varianti
      const productRes = await shopify2.getProduct(product_id);

      if (!productRes?.product?.variants) continue;

      const variants = productRes.product.variants;

      const batch = adminDb.batch();
      const ref = adminDb.collection("blanks_stock").doc(blank_key);

      for (const v of variants) {
        const size = v.option1 || "NO_SIZE";
        const color = v.option2 || "NO_COLOR";

        const docId = `${size}-${color}`.toLowerCase().replace(/\s+/g, "_");

        batch.set(ref.collection("variants").doc(docId), {
          size,
          color,
          qty: v.inventory_quantity,
          variant_id: v.id,
          inventory_item_id: v.inventory_item_id,
          updated_at: new Date().toISOString(),
        });
      }

      await batch.commit();

      processed.push({
        blank_key,
        variants: variants.length,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Stock blanks generato su Firestore",
      processed,
    });

  } catch (err: any) {
    console.error("Errore build blanks stock:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}