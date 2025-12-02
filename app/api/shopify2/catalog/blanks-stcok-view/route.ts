import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const blanksCollection = await adminDb.collection("blanks_stock").get();

    const results: any[] = [];

    for (const blankDoc of blanksCollection.docs) {
      const blank_key = blankDoc.id;

      const invSnap = await blankDoc.ref.collection("inventory").get();

      const inventory: any[] = [];

      invSnap.forEach((doc) => {
        const d = doc.data();
        inventory.push({
          id: doc.id,
          taglia: d.taglia,
          colore: d.colore,
          stock: d.stock,
          variant_id: d.variant_id,
          updated_at: d.updated_at,
        });
      });

      results.push({
        blank_key,
        inventory,
      });
    }

    return NextResponse.json({
      ok: true,
      blanks: results,
    });

  } catch (err: any) {
    console.error("❌ Errore blanks-stock-view:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}