import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    if (!hmacHeader || !verifyWebhook(body, hmacHeader)) {
      console.error("❌ Webhook non verificato");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = JSON.parse(body);
    
    console.log(`📥 Webhook ricevuto: Ordine #${order.order_number}`);

    // ✅ IDEMPOTENZA: Cerca documento esistente per questo order_id
    const existingLogSnap = await adminDb
      .collection("orders_stock_log")
      .where("order_id", "==", order.id)
      .limit(1)
      .get();

    let logDocRef;

    if (!existingLogSnap.empty) {
      const existing = existingLogSnap.docs[0];
      const existingData = existing.data();
      
      // Se già completato, skip
      if (existingData.status === "completed") {
        console.log(`⚠️ Ordine #${order.order_number} già completato`);
        return NextResponse.json({
          ok: true,
          message: "Order already processed",
          skipped: true,
        });
      }

      // Se in processing da > 5 minuti, reset
      if (existingData.status === "processing") {
        const startedAt = new Date(existingData.started_at);
        const now = new Date();
        const diffMs = now.getTime() - startedAt.getTime();
        
        if (diffMs < 300000) { // 5 minuti
          console.log(`⚠️ Ordine #${order.order_number} già in processing`);
          return NextResponse.json({
            ok: true,
            message: "Order already processing",
            log_id: existing.id,
          });
        }
        
        console.log(`🔄 Reset ordine #${order.order_number} (timeout)`);
      }

      logDocRef = existing.ref;
    } else {
      // ✅ Crea nuovo documento log
      logDocRef = await adminDb.collection("orders_stock_log").add({
        order_number: order.order_number,
        order_id: order.id,
        status: "received",
        received_at: new Date().toISOString(),
        total_items: order.line_items.length,
        items_processed: 0,
        items_success: 0,
        items_failed: 0,
      });
    }

    // ✅ Aggiorna stato → processing
    await logDocRef.update({
      status: "processing",
      started_at: new Date().toISOString(),
      current_item: null,
      progress_percent: 0,
    });

    // ✅ Avvia processing asincrono
    processOrderWithLiveUpdates(order, logDocRef).catch((err) => {
      console.error("❌ Errore processing:", err);
    });

    // ✅ Rispondi subito a Shopify
    return NextResponse.json({
      ok: true,
      order_number: order.order_number,
      message: "Processing started",
      log_id: logDocRef.id,
    });

  } catch (err: any) {
    console.error("❌ Errore webhook:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

// ✅ PROCESSING con aggiornamenti live
async function processOrderWithLiveUpdates(order: any, logDocRef: any) {
  const allResults: any[] = [];
  const allErrors: any[] = [];

  try {
    const locationsRes = await shopify2.api("/locations.json");
    const locationId = locationsRes.locations?.[0]?.id;

    if (!locationId) {
      throw new Error("Location ID non trovato");
    }

    const totalItems = order.line_items.length;

    for (let itemIdx = 0; itemIdx < totalItems; itemIdx++) {
      const item = order.line_items[itemIdx];
      const variantIdGrafica = item.variant_id;
      const quantity = item.quantity;

      // ✅ Aggiorna progresso
      await logDocRef.update({
        current_item: item.title,
        items_processed: itemIdx + 1,
        progress_percent: Math.round(((itemIdx + 1) / totalItems) * 100),
        last_update: new Date().toISOString(),
      });

      console.log(`\n📝 [${itemIdx + 1}/${totalItems}] ${item.title}`);

      try {
        const assocSnap = await adminDb
          .collection("graphics_blanks")
          .doc(String(variantIdGrafica))
          .get();

        if (!assocSnap.exists) {
          const error = {
            variant_id: variantIdGrafica,
            title: item.title,
            error: "Associazione non trovata",
            timestamp: new Date().toISOString(),
          };
          
          allErrors.push(error);
          
          // ✅ Aggiorna log con errore
          await logDocRef.update({
            items_failed: FieldValue.increment(1),
            [`errors.${variantIdGrafica}`]: error,
          });
          
          continue;
        }

        const assoc = assocSnap.data();
        const blankKey = assoc.blank_key;
        const blankVariantId = assoc.blank_variant_id;

        // ✅ Aggiorna status item
        await logDocRef.update({
          [`items.${variantIdGrafica}.status`]: "updating_blank",
          [`items.${variantIdGrafica}.blank_key`]: blankKey,
        });

        const variantsSnap = await adminDb
          .collection("blanks_stock")
          .doc(blankKey)
          .collection("variants")
          .where("variant_id", "==", blankVariantId)
          .get();

        if (variantsSnap.empty) {
          const error = {
            variant_id: variantIdGrafica,
            title: item.title,
            error: "Blank variant non trovata",
            timestamp: new Date().toISOString(),
          };
          
          allErrors.push(error);
          
          await logDocRef.update({
            items_failed: FieldValue.increment(1),
            [`errors.${variantIdGrafica}`]: error,
          });
          
          continue;
        }

        const blankVariantDoc = variantsSnap.docs[0];

        // ✅ Transazione stock
        const newStock = await adminDb.runTransaction(async (transaction) => {
          const blankData = await transaction.get(blankVariantDoc.ref);
          const currentStock = blankData.data()?.stock || 0;
          const calculatedStock = Math.max(0, currentStock - quantity);

          transaction.update(blankVariantDoc.ref, {
            stock: calculatedStock,
            updated_at: new Date().toISOString(),
            last_order: order.order_number,
          });

          return { previous: currentStock, new: calculatedStock };
        });

        console.log(`📉 Stock: ${newStock.previous} → ${newStock.new}`);

        // ✅ Aggiorna log stock
        await logDocRef.update({
          [`items.${variantIdGrafica}.stock_updated`]: true,
          [`items.${variantIdGrafica}.previous_stock`]: newStock.previous,
          [`items.${variantIdGrafica}.new_stock`]: newStock.new,
          [`items.${variantIdGrafica}.status`]: "updating_graphics",
        });

        // Trova grafiche
        const allGraphicsSnap = await adminDb
          .collection("graphics_blanks")
          .where("blank_key", "==", blankKey)
          .where("blank_variant_id", "==", blankVariantId)
          .get();

        const totalGraphics = allGraphicsSnap.size;
        console.log(`🎨 ${totalGraphics} grafiche da aggiornare`);

        // ✅ Aggiorna count grafiche
        await logDocRef.update({
          [`items.${variantIdGrafica}.total_graphics`]: totalGraphics,
          [`items.${variantIdGrafica}.graphics_processed`]: 0,
        });

        const graphicsUpdated: any[] = [];
        const graphicsErrors: any[] = [];
        let callCount = 0;
        const DELAY_MS = 600;

        for (let gIdx = 0; gIdx < allGraphicsSnap.docs.length; gIdx++) {
          const graphicDoc = allGraphicsSnap.docs[gIdx];
          const graphicData = graphicDoc.data();
          const graphicVariantId = graphicData.variant_id_grafica;

          try {
            if (callCount > 0 && callCount % 2 === 0) {
              await delay(DELAY_MS);
            }

            const variantRes = await shopify2.api(`/variants/${graphicVariantId}.json`);
            const inventoryItemId = variantRes.variant?.inventory_item_id;
            callCount++;

            if (!inventoryItemId) {
              throw new Error("inventory_item_id non trovato");
            }

            if (callCount % 2 === 0) {
              await delay(DELAY_MS);
            }

            await shopify2.api(`/inventory_levels/set.json`, {
              method: "POST",
              body: JSON.stringify({
                location_id: locationId,
                inventory_item_id: inventoryItemId,
                available: newStock.new,
              }),
            });
            callCount++;

            graphicsUpdated.push({
              variant_id: graphicVariantId,
              product_title: graphicData.product_title || "N/A",
              size: graphicData.size,
              color: graphicData.color,
            });

            // ✅ Aggiorna progresso grafiche ogni 10
            if ((gIdx + 1) % 10 === 0 || gIdx === allGraphicsSnap.docs.length - 1) {
              await logDocRef.update({
                [`items.${variantIdGrafica}.graphics_processed`]: gIdx + 1,
                [`items.${variantIdGrafica}.graphics_percent`]: Math.round(((gIdx + 1) / totalGraphics) * 100),
              });
            }

            console.log(`  ✅ [${gIdx + 1}/${totalGraphics}] ${graphicVariantId}`);
          } catch (err: any) {
            // Retry su 429
            if (err.message.includes("429")) {
              console.log(`  ⏳ Rate limit, retry...`);
              await delay(2000);
              
              try {
                const retryRes = await shopify2.api(`/variants/${graphicVariantId}.json`);
                const retryInvId = retryRes.variant?.inventory_item_id;

                if (retryInvId) {
                  await delay(600);
                  await shopify2.api(`/inventory_levels/set.json`, {
                    method: "POST",
                    body: JSON.stringify({
                      location_id: locationId,
                      inventory_item_id: retryInvId,
                      available: newStock.new,
                    }),
                  });

                  graphicsUpdated.push({
                    variant_id: graphicVariantId,
                    product_title: graphicData.product_title || "N/A",
                    size: graphicData.size,
                    color: graphicData.color,
                  });
                  continue;
                }
              } catch (retryErr) {
                // Fallthrough
              }
            }

            graphicsErrors.push({
              variant_id: graphicVariantId,
              product_title: graphicData.product_title || "N/A",
              error: err.message,
            });
          }
        }

        // ✅ Finalizza item
        await logDocRef.update({
          items_success: FieldValue.increment(1),
          [`items.${variantIdGrafica}.status`]: "completed",
          [`items.${variantIdGrafica}.graphics_updated`]: graphicsUpdated,
          [`items.${variantIdGrafica}.graphics_errors`]: graphicsErrors,
          [`items.${variantIdGrafica}.completed_at`]: new Date().toISOString(),
        });

        allResults.push({
          order_item: item.title,
          blank_key: blankKey,
          size: assoc.size,
          color: assoc.color,
          previous_stock: newStock.previous,
          new_stock: newStock.new,
          graphics_updated: graphicsUpdated,
          graphics_errors: graphicsErrors,
        });

      } catch (err: any) {
        const error = {
          variant_id: variantIdGrafica,
          title: item.title,
          error: err.message,
          timestamp: new Date().toISOString(),
        };
        
        allErrors.push(error);
        
        await logDocRef.update({
          items_failed: FieldValue.increment(1),
          [`items.${variantIdGrafica}.status`]: "failed",
          [`items.${variantIdGrafica}.error`]: error,
        });
      }
    }

    // ✅ COMPLETA ordine
    await logDocRef.update({
      status: "completed",
      completed_at: new Date().toISOString(),
      progress_percent: 100,
      summary: {
        total_items: totalItems,
        successful: allResults.length,
        failed: allErrors.length,
      },
    });

    console.log(`✅ Ordine #${order.order_number} completato: ${allResults.length}/${totalItems}`);

  } catch (err: any) {
    console.error("❌ Errore critico:", err);
    
    await logDocRef.update({
      status: "failed",
      failed_at: new Date().toISOString(),
      critical_error: err.message,
    });
  }
}

