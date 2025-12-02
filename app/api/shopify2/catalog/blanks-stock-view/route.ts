import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🔍 Inizio query blanks_stock...");
    
    const blanksSnap = await adminDb.collection("blanks_stock").get();

    console.log("📊 Documenti trovati in blanks_stock:", blanksSnap.size);

    if (blanksSnap.empty) {
      console.warn("⚠️ Collection blanks_stock è VUOTA!");
      return NextResponse.json({ 
        ok: true, 
        blanks: [],
        warning: "Collection blanks_stock è vuota"
      });
    }

    const blanks: any[] = [];

    for (const doc of blanksSnap.docs) {
      const blank_key = doc.id;
      console.log(`📦 Elaboro blank: ${blank_key}`);

      const variantsSnap = await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("variants")
        .get();

      console.log(`  └─ Varianti trovate per ${blank_key}:`, variantsSnap.size);

      const inventory: any[] = [];

      variantsSnap.forEach((v) => {
        const d = v.data();
        console.log(`    ├─ Variante: ${v.id}`, d);
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

    console.log("✅ Totale blanks elaborati:", blanks.length);

    return NextResponse.json({ ok: true, blanks });

  } catch (err: any) {
    console.error("❌ Errore blanks-stock-view:", err);
    return NextResponse.json({ 
      ok: false, 
      error: err.message,
      stack: err.stack 
    }, { status: 500 });
  }
}
