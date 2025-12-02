import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { blank_key, variant_id, new_stock, mode } = await req.json();

    if (!blank_key || !variant_id) {
      return NextResponse.json({
        ok: false,
        error: "blank_key e variant_id sono obbligatori",
      });
    }

    console.log(`🔄 Aggiornamento variante: ${blank_key} → variant ${variant_id}`);

    // 1️⃣ Trova la variante blank in Firebase
    const variantsSnap = await adminDb
      .collection("blanks_stock")
      .doc(blank_key)
      .collection("variants")
      .where("variant_id", "==", Number(variant_id))
      .get();

    if (variantsSnap.empty) {
      return NextResponse.json({
        ok: false,
        error: `Variante ${variant_id} non trovata per blank ${blank_key}`,
      });
    }

    const variantDoc = variantsSnap.docs[0];
    const currentData = variantDoc.data();
    const currentStock = currentData.stock || 0;

    // 2️⃣ Calcola nuovo stock (set o add)
    const updateMode = mode || "set";
    let finalStock = 0;

    if (updateMode === "add") {
      finalStock = currentStock + Number(new_stock);
    } else {
      finalStock = Number(new_stock);
    }

    // 3️⃣ Aggiorna Firebase
    await variantDoc.ref.update({
      stock: finalStock,
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ Firebase aggiornato: ${currentStock} → ${finalStock}`);

    // 4️⃣ Trova TUTTE le grafiche associate a QUELLA variante
    const assocSnap = await adminDb
      .collection("graphics_blanks")
      .where("blank_key", "==", blank_key)
      .where("blank_variant_id", "==", Number(variant_id))
      .get();

    if (assocSnap.empty) {
      return NextResponse.json({
        ok: true,
        message: `Stock aggiornato ma nessuna grafica associata`,
        previous_stock: currentStock,
        new_stock: finalStock,
        graphics_updated: 0,
      });
    }

    console.log(`🎨 ${assocSnap.size} grafiche trovate da aggiornare`);

    // 5️⃣ Carica location_id una volta sola
    const locationsRes = await shopify2.api("/locations.json");
    const locationId = locationsRes.locations?.[0]?.id;

    if (!locationId) {
      return NextResponse.json({
        ok: false,
        error: "Location ID non trovato su Shopify",
      });
    }

    const updates: any[] = [];
    const errors: any[] = [];

    // 6️⃣ Aggiorna ogni grafica su Shopify
    for (const doc of assocSnap.docs) {
      const assoc = doc.data();
      const graphicVariantId = Number(assoc.variant_id_grafica);

      try {
        // Recupero inventory_item_id
        const variantRes = await shopify2.api(`/variants/${graphicVariantId}.json`);
        const inventoryItemId = variantRes.variant?.inventory_item_id;

        if (!inventoryItemId) {
          throw new Error("inventory_item_id non trovato");
        }

        // Aggiorna inventory su Shopify
        await shopify2.api(`/inventory_levels/set.json`, {
          method: "POST",
          body: JSON.stringify({
            location_id: locationId,
            inventory_item_id: inventoryItemId,
            available: finalStock,
          }),
        });

        updates.push({
          graphic_variant_id: graphicVariantId,
          product_title: assoc.product_title || "N/A",
          new_stock: finalStock,
        });

        console.log(`✅ Grafica ${graphicVariantId} → stock ${finalStock}`);

      } catch (err: any) {
        errors.push({
          graphic_variant_id: graphicVariantId,
          error: err.message,
        });
        console.error(`❌ Errore grafica ${graphicVariantId}:`, err.message);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Stock aggiornato: ${currentStock} → ${finalStock}`,
      blank_key,
      variant_id,
      previous_stock: currentStock,
      new_stock: finalStock,
      graphics_updated: updates.length,
      graphics_errors: errors.length,
      updates: updates.slice(0, 10),
      errors: errors.slice(0, 5),
    });

  } catch (err: any) {
    console.error("❌ Errore update-blank-variant:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
