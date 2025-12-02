import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = adminDb;

    // 1️⃣ Recupera mapping blanks
    const mappingSnap = await db.collection("blanks_mapping").get();
    if (mappingSnap.empty) {
      return NextResponse.json({
        ok: false,
        error: "Nessuna mappatura trovata",
      });
    }

    const mappings: {
      category: string;
      blank_key: string | null;
      product_id: number | null;
      blank_assigned: boolean;
    }[] = [];

    mappingSnap.forEach((doc) => mappings.push(doc.data() as any));

    // 2️⃣ Filtra solo i blanks assegnati con un product_id valido
    const assigned = mappings.filter(
      (m) => m.blank_assigned && m.product_id && m.blank_key
    );

    const processed: any[] = [];

    // 3️⃣ Cicla ogni BLANK
    for (const map of assigned) {
      const { product_id, blank_key, category } = map;

      // > Sanity check
      if (!product_id || !blank_key) continue;

      // 4️⃣ Scarica prodotto completo da Shopify — CORRETTO
      const productRes = await shopify2.api(`products/${product_id}.json`);

      if (!productRes || !productRes.product || !productRes.product.variants) {
        console.log("❌ Nessun prodotto o varianti per", product_id);
        continue;
      }

      const variants = productRes.product.variants;

      // 5️⃣ Salva su Firestore
      const blankRef = db.collection("blanks_stock").doc(blank_key);
      const batch = db.batch();

      for (const v of variants) {
        const size = v.option1;
        const color = v.option2;
        const qty = v.inventory_quantity ?? 0;

        const key = `${size}_${color}`.replace(/\s+/g, "_").toLowerCase();

        const docRef = blankRef.collection("variants").doc(key);

        batch.set(docRef, {
          size,
          color,
          qty,
          variant_id: v.id,
          inventory_item_id: v.inventory_item_id,
          updated_at: new Date(),
        });
      }

      await batch.commit();

      processed.push({
        blank_key,
        product_id,
        variants: variants.length,
      });

      console.log(`✔️ Salvato BLANK ${blank_key} con ${variants.length} varianti`);
    }

    return NextResponse.json({
      ok: true,
      message: "Stock blanks generato correttamente",
      processed,
    });
  } catch (err: any) {
    console.error("❌ Errore build blanks stock:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}