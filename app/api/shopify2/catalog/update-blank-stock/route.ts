import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { variant_id, blank_key, new_stock, mode } = await req.json();

    // mode può essere "set" (sostituisci) o "add" (somma)
    const updateMode = mode || "set";

    // Trova la variante
    const variantsSnap = await adminDb
      .collection("blanks_stock")
      .doc(blank_key)
      .collection("variants")
      .where("variant_id", "==", Number(variant_id))
      .get();

    if (variantsSnap.empty) {
      return NextResponse.json(
        { ok: false, error: "Variante non trovata" },
        { status: 404 }
      );
    }

    const variantDoc = variantsSnap.docs[0];
    const currentData = variantDoc.data();
    const currentStock = currentData.stock || 0;

    let finalStock = 0;

    if (updateMode === "add") {
      // Somma alla quantità attuale
      finalStock = currentStock + Number(new_stock);
    } else {
      // Sostituisci
      finalStock = Number(new_stock);
    }

    // Aggiorna Firestore
    await variantDoc.ref.update({
      stock: finalStock,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: `Stock aggiornato: ${currentStock} → ${finalStock}`,
      previous_stock: currentStock,
      new_stock: finalStock,
    });
  } catch (err: any) {
    console.error("❌ Errore update-blank-stock:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
