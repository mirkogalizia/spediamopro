import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ Carico mapping categorie → blanks
    const mappingSnap = await adminDb.collection("blanks_mapping").get();
    const mapping: Record<string, string> = {};

    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_key) mapping[d.category] = d.blank_key;
    });

    if (Object.keys(mapping).length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Nessun mapping categoria → blank trovato",
      });
    }

    // 2️⃣ Scarico TUTTI i prodotti dal catalogo Shopify
    const productsRes = await shopify2.listProducts(250);
    const products = productsRes.products || [];

    const processed: any[] = [];

    for (const p of products) {
      const category = p.product_type?.trim().toLowerCase() || "no_type";
      const blank_key = mapping[category];

      // se non ha blank associato, skip
      if (!blank_key) continue;

      // 3️⃣ Per ogni variante della grafica
      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();

        const blankVariantKey = `${size}-${color}`;

        // 4️⃣ Cerca variante del blank esatto
        const blankVariantSnap = await adminDb
          .collection("blanks_stock")
          .doc(blank_key)
          .collection("variants")
          .doc(blankVariantKey)
          .get();

        if (!blankVariantSnap.exists) {
          console.log("⚠️ Variante blank non trovata:", blankVariantKey);
          continue;
        }

        // Dati del blank
        const blankData = blankVariantSnap.data();

        // 5️⃣ Leggi numero_grafica dal metafield Shopify
        let numero_grafica = null;
        try {
          const metafields = await shopify2.api(
            `/products/${p.id}/variants/${v.id}/metafields.json`
          );
          numero_grafica =
            metafields?.metafields?.find(
              (m: any) => m.namespace === "custom" && m.key === "numero_grafica"
            )?.value || null;
        } catch (e) {
          console.log("⚠️ Nessun metafield trovato per", v.id);
        }

        // 6️⃣ Salva in Firestore
        const ref = adminDb
          .collection("graphics_blanks")
          .doc(String(v.id));

        await ref.set({
          product_id: p.id,
          variant_id_grafica: v.id,
          blank_key,
          blank_variant_id: blankData.variant_id,
          size,
          color,
          numero_grafica,
          updated_at: new Date().toISOString(),
        });

        processed.push({
          variant: v.id,
          blank_key,
          blank_variant: blankData.variant_id,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed_count: processed.length,
      processed,
    });
  } catch (err: any) {
    console.error("❌ Errore assign-blanks:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}