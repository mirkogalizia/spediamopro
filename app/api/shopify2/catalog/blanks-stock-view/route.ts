// app/api/shopify2/catalog/blanks-stock-view/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🔍 Inizio query blanks_stock...");

    // ✅ FIX: Leggi i blank_key da blanks_mapping invece di blanks_stock
    const mappingSnap = await adminDb.collection("blanks_mapping").get();

    const blankKeys = new Set<string>();
    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_assigned && d.blank_key) {
        blankKeys.add(d.blank_key);
      }
    });

    console.log("📊 Blanks trovati:", Array.from(blankKeys));

    if (blankKeys.size === 0) {
      return NextResponse.json({
        ok: true,
        blanks: [],
        warning: "Nessun blank mappato in blanks_mapping",
      });
    }

    const blanks: any[] = [];

    // Cicla su ogni blank_key
    for (const blank_key of blankKeys) {
      console.log(`📦 Elaboro blank: ${blank_key}`);

      const variantsSnap = await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("variants")
        .get();

      console.log(`  └─ Varianti trovate per ${blank_key}:`, variantsSnap.size);

      if (variantsSnap.empty) {
        console.warn(`⚠️ Nessuna variante per ${blank_key}`);
        continue;
      }

      const inventory: any[] = [];

      variantsSnap.forEach((v) => {
        const d = v.data();
        inventory.push({
          id: v.id,
          taglia: d.taglia,
          colore: d.colore,
          stock: d.stock || 0,
          updated_at: d.updated_at,
          variant_id: d.variant_id,
        });
      });

      // Ordina per taglia e colore
      inventory.sort((a, b) => {
        if (a.taglia !== b.taglia) {
          return a.taglia.localeCompare(b.taglia, undefined, { numeric: true });
        }
        return a.colore.localeCompare(b.colore);
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
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

