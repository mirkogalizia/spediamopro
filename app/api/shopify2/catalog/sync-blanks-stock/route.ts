import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🔄 Sync blanks stock iniziato...");

    // 1️⃣ Prendo tutti i blank salvati
    const blanksSnap = await adminDb.collection("blanks_stock").get();

    if (blanksSnap.empty) {
      return NextResponse.json({
        ok: false,
        error: "Nessun blank presente in Firestore",
      });
    }

    const results: any[] = [];

    // 2️⃣ Loop per ogni blank_key
    for (const blankDoc of blanksSnap.docs) {
      const blank_key = blankDoc.id;
      const product_id = blankDoc.data().product_id;

      if (!product_id) {
        console.log("⚠️ blank senza product_id:", blank_key);
        continue;
      }

      // 3️⃣ Leggo varianti direttamente da Shopify
      const url = `/products/${product_id}/variants.json?limit=250`;

      let variants: any[] = [];
      try {
        const res = await shopify2.api(url);
        variants = res.variants || [];
      } catch (err: any) {
        console.log("❌ Errore chiamata Shopify:", err.message);
        continue;
      }

      console.log(`📦 ${blank_key}: ${variants.length} varianti trovate su Shopify`);

      // 4️⃣ Aggiorno Firestore
      for (const v of variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();
        const stock = Number(v.inventory_quantity || 0);

        const variantKey = `${size}-${color}`;

        const ref = adminDb
          .collection("blanks_stock")
          .doc(blank_key)
          .collection("variants")
          .doc(variantKey);

        await ref.set(
          {
            taglia: size,
            colore: color,
            stock,
            updated_at: new Date().toISOString(),
            variant_id: v.id,
          },
          { merge: true }
        );

        results.push({
          blank_key,
          variant: variantKey,
          stock,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      updated_count: results.length,
      results,
    });
  } catch (err: any) {
    console.error("❌ Errore sync-blanks-stock:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}