import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Verifica firma webhook Shopify
function verifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  
  return hash === hmacHeader;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

    // Verifica autenticità webhook
    if (!hmacHeader || !verifyWebhook(body, hmacHeader)) {
      console.error("❌ Webhook non verificato");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = JSON.parse(body);
    
    console.log(`🛒 Ordine pagato ricevuto: #${order.order_number}`);
    console.log(`📦 Line items: ${order.line_items.length}`);

    const results: any[] = [];
    const errors: any[] = [];

    // Carica location_id una volta sola
    const locationsRes = await shopify2.api("/locations.json");
    const locationId = locationsRes.locations?.[0]?.id;

    if (!locationId) {
      throw new Error("Location ID non trovato");
    }

    // Processa ogni line item
    for (const item of order.line_items) {
      const variantIdGrafica = item.variant_id;
      const quantity = item.quantity;

      console.log(`\n📝 Processing: ${item.title} (Variant: ${variantIdGrafica}, Qty: ${quantity})`);

      try {
        // 1️⃣ Trova l'associazione in graphics_blanks
        const assocSnap = await adminDb
          .collection("graphics_blanks")
          .doc(String(variantIdGrafica))
          .get();

        if (!assocSnap.exists) {
          errors.push({
            variant_id: variantIdGrafica,
            title: item.title,
            error: "Associazione non trovata in graphics_blanks",
          });
          console.log(`⚠️ Nessuna associazione trovata per variant ${variantIdGrafica}`);
          continue;
        }

        const assoc = assocSnap.data();
        const blankKey = assoc.blank_key;
        const blankVariantId = assoc.blank_variant_id;

        console.log(`✅ Associazione trovata: ${blankKey} → blank_variant ${blankVariantId}`);

        // 2️⃣ Trova la variante blank in Firebase
        const variantsSnap = await adminDb
          .collection("blanks_stock")
          .doc(blankKey)
          .collection("variants")
          .where("variant_id", "==", blankVariantId)
          .get();

        if (variantsSnap.empty) {
          errors.push({
            variant_id: variantIdGrafica,
            title: item.title,
            error: `Blank variant ${blankVariantId} non trovata`,
          });
          console.log(`❌ Blank variant ${blankVariantId} non trovata`);
          continue;
        }

        const blankVariantDoc = variantsSnap.docs[0];
        const currentStock = blankVariantDoc.data().stock || 0;
        const newStock = Math.max(0, currentStock - quantity); // Non andare sotto 0

        console.log(`📉 Stock blank: ${currentStock} → ${newStock} (-${quantity})`);

        // 3️⃣ Aggiorna stock blank in Firebase
        await blankVariantDoc.ref.update({
          stock: newStock,
          updated_at: new Date().toISOString(),
          last_order: order.order_number,
        });

        // 4️⃣ Trova TUTTE le grafiche associate a questo blank_variant
        const allGraphicsSnap = await adminDb
          .collection("graphics_blanks")
          .where("blank_key", "==", blankKey)
          .where("blank_variant_id", "==", blankVariantId)
          .get();

        console.log(`🎨 Trovate ${allGraphicsSnap.size} grafiche da aggiornare`);

        const graphicsUpdated: number[] = [];
        const graphicsErrors: any[] = [];

        // 5️⃣ Aggiorna inventory su Shopify per ogni grafica
        for (const graphicDoc of allGraphicsSnap.docs) {
          const graphicData = graphicDoc.data();
          const graphicVariantId = graphicData.variant_id_grafica;

          try {
            // Recupera inventory_item_id
            const variantRes = await shopify2.api(`/variants/${graphicVariantId}.json`);
            const inventoryItemId = variantRes.variant?.inventory_item_id;

            if (!inventoryItemId) {
              throw new Error("inventory_item_id non trovato");
            }

            // Aggiorna inventory
            await shopify2.api(`/inventory_levels/set.json`, {
              method: "POST",
              body: JSON.stringify({
                location_id: locationId,
                inventory_item_id: inventoryItemId,
                available: newStock,
              }),
            });

            graphicsUpdated.push(graphicVariantId);
            console.log(`  ✅ Grafica ${graphicVariantId} → ${newStock}`);
          } catch (err: any) {
            graphicsErrors.push({
              variant_id: graphicVariantId,
              error: err.message,
            });
            console.log(`  ❌ Errore grafica ${graphicVariantId}: ${err.message}`);
          }
        }

        results.push({
          order_item: item.title,
          variant_id_grafica: variantIdGrafica,
          blank_key: blankKey,
          blank_variant_id: blankVariantId,
          previous_stock: currentStock,
          new_stock: newStock,
          quantity_ordered: quantity,
          graphics_updated: graphicsUpdated.length,
          graphics_errors: graphicsErrors.length,
        });

      } catch (err: any) {
        errors.push({
          variant_id: variantIdGrafica,
          title: item.title,
          error: err.message,
        });
        console.error(`❌ Errore processing variant ${variantIdGrafica}:`, err);
      }
    }

    // Log finale
    console.log(`\n✅ Ordine #${order.order_number} processato:`);
    console.log(`  - Items processati: ${results.length}/${order.line_items.length}`);
    console.log(`  - Errori: ${errors.length}`);

    // Salva log in Firebase
    await adminDb.collection("orders_stock_log").add({
      order_number: order.order_number,
      order_id: order.id,
      processed_at: new Date().toISOString(),
      total_items: order.line_items.length,
      successful: results.length,
      errors: errors.length,
      results,
      errors,
    });

    return NextResponse.json({
      ok: true,
      order_number: order.order_number,
      processed: results.length,
      errors: errors.length,
      results,
      errors,
    });

  } catch (err: any) {
    console.error("❌ Errore webhook orders-paid:", err);
    
    // Salva errore critico
    try {
      await adminDb.collection("orders_stock_log").add({
        error: err.message,
        stack: err.stack,
        processed_at: new Date().toISOString(),
        critical: true,
      });
    } catch (logErr) {
      console.error("❌ Errore logging:", logErr);
    }

    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
