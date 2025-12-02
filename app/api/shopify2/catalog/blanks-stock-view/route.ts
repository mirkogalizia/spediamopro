import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const blanksSnap = await adminDb.collection("blanks_stock").get();

    const blanks: any[] = [];

    for (const doc of blanksSnap.docs) {
      const blank_key = doc.id;

      // Legge la sottocollezione "inventory"
      const invSnap = await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("inventory")
        .get();

      const inventory: any[] = [];

      invSnap.forEach((v) => {
        const d = v.data();
        inventory.push({
          id: v.id,
          taglia: d.taglia,
          colore: d.colore,
          stock: d.stock,
          updated_at: d.updated_at,
          variant_id: d.variant_id,
        });
      });

      blanks.push({
        blank_key,
        inventory,
      });
    }

    return NextResponse.json({ ok: true, blanks });
  } catch (err: any) {
    console.error("❌ Errore blanks-stock-view:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}