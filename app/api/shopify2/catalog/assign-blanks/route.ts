import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    // 1️⃣ Mapping categoria → blank_key
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

    // 2️⃣ Tutti i prodotti Shopify
    const { products } = await shopify2.listProducts(250);

    const mapped: any[] = [];
    const skippedVariants: any[] = [];
    const errors: any[] = [];

    for (const p of products) {
      const category = p.product_type?.trim().toLowerCase() || "no_type";
      const blank_key = mapping[category];

      if (!blank_key) continue; // non mappato per design

      for (const v of p.variants) {
        const size = (v.option1 || "").toUpperCase().trim();
        const color = (v.option2 || "").toLowerCase().trim();
        const blankVariantKey = `${size}-${color}`;

        // 3️⃣ Verifica se esiste BLANK corrispondente
        const blankSnap = await adminDb
          .collection("blanks_stock")
          .doc(blank_key)
          .collection("variants")
          .doc(blankVariantKey)
          .get();

        if (!blankSnap.exists) {
          skippedVariants.push({
            product_id: p.id,
            variant_id: v.id,
            blank_key,
            reason: `Blank variant missing: ${blankVariantKey}`,
          });
          continue; // ❗ skip SOLO QUESTA variante
        }

        const blankData = blankSnap.data();

        // 4️⃣ Recupera numero_grafica dal metafield
        let numero_grafica = null;
        try {
          const metafields = await shopify2.api(
            `/products/${p.id}/variants/${v.id}/metafields.json`
          );
          numero_grafica =
            metafields?.metafields?.find(
              (m: any) =>
                m.namespace === "custom" && m.key === "numero_grafica"
            )?.value || null;
        } catch (err) {
          // niente di critico
        }

        // 5️⃣ Salva nel mapping
        await adminDb
          .collection("graphics_blanks")
          .doc(String(v.id))
          .set({
            product_id: p.id,
            variant_id_grafica: v.id,
            size,
            color,
            blank_key,
            blank_variant_id: blankData.variant_id,
            numero_grafica,
            updated_at: new Date().toISOString(),
          });

        mapped.push({
          product_id: p.id,
          variant_id: v.id,
          blank_key,
          blank_variant: blankData.variant_id,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mapped_count: mapped.length,
      skipped_count: skippedVariants.length,
      mapped: mapped.slice(0, 30),
      skipped: skippedVariants.slice(0, 30),
    });
  } catch (err: any) {
    console.error("❌ assign-blanks error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}