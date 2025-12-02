import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = adminDb;

    // 1️⃣ Carica la mappatura BLANKS
    const mappingSnap = await db.collection("blanks_mapping").get();

    if (mappingSnap.empty) {
      return NextResponse.json({
        ok: false,
        error: "Nessuna mappatura trovata in blanks_mapping",
      });
    }

    const mappings = mappingSnap.docs.map((doc) => doc.data());

    // 2️⃣ Filtra solo quelli con BLANK assegnato
    const assigned = mappings.filter((m: any) => m.blank_assigned && m.product_id);

    const processed: any[] = [];

    // 3️⃣ Per ogni BLANK, scarica le varianti da Shopify
    for (const map of assigned) {
      const { blank_key, product_id } = map;

      if (!product_id || !blank_key) continue;

      // 🟦 Scarica prodotto da Shopify
const productRes = await shopify2.getProduct(product_id);

if (
  !productRes ||
  !productRes.product ||
  !productRes.product.variants
) {
  console.log("❌ Nessun prodotto o varianti per", product_id);
  continue;
}

// 🔥 UNA sola definizione
const variants = productRes.product.variants;

// 4️⃣ Salva lo stock nel Firestore
const blankRef = db.collection("blanks_stock").doc(blank_key);
const batch = db.batch();

variants.forEach((v: any) => {
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
});

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
      message: "Stock blanks generato su Firestore",
      processed,
    });
  } catch (err: any) {
    console.error("❌ Errore generate blanks:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}