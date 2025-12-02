// app/api/shopify2/catalog/build-mapping/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

const BLANKS = {
  "felpa girocollo": { key: "crewneck", id: 15315087524223 },
  "felpa cappuccio": { key: "felpa_cappuccio", id: 15315049218431 },
  "t shirt": { key: "tshirt", id: 15315045089663 },
  "sweatpants": { key: "sweatpants", id: 15315031228799 },
  "felpa zip": { key: "zip_hoodie", id: 15315031261567 },
};

export async function GET() {
  try {
    const snap = await adminDb.collection("catalog_products").get();

    const categories = new Set<string>();
    snap.forEach((doc) => categories.add(doc.data().product_type));

    const mapping = [];

    for (const category of categories) {
      const base = BLANKS[category] || null;

      const data = {
        category,
        blank_key: base?.key || null,
        product_id: base?.id || null,
        blank_assigned: !!base,
      };

      await adminDb.collection("blanks_mapping")
        .doc(category)
        .set(data);

      mapping.push(data);
    }

    return NextResponse.json({
      ok: true,
      message: "Mapping creato con successo",
      mapping,
    });

  } catch (err: any) {
    console.error("Errore build mapping:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}