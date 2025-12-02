import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Legge TUTTI i blanks
    const blanksSnap = await adminDb.collection("blanks_stock").get();
    const results: any[] = [];

    for (const blankDoc of blanksSnap.docs) {
      const blank_key = blankDoc.id;

      // Legge inventario per ogni blank
      const invSnap = await blankDoc.ref.collection("inventory").get();
      const inventory: any[] = [];

      invSnap.forEach((d) => {
        const row = d.data();
        inventory.push({
          id: d.id,
          taglia: row.taglia,
          colore: row.colore,
          stock: row.stock,
          variant_id: row.variant_id,
          updated_at: row.updated_at,
        });
      });

      results.push({ blank_key, inventory });
    }

    return NextResponse.json({
      ok: true,
      blanks: results,
    });
  } catch (err: any) {
    console.error("❌ Errore API blanks-stock-view:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}