import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";
import crypto from "crypto";
import { OrderQueue } from "@/lib/orderQueue";

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

    // ✅ CHECK IDEMPOTENZA
    const existingLog = await adminDb
      .collection("orders_stock_log")
      .where("order_id", "==", order.id)
      .limit(1)
      .get();

    if (!existingLog.empty) {
      const existing = existingLog.docs[0].data();
      console.log(`⚠️ Ordine #${order.order_number} già processato`);
      return NextResponse.json({
        ok: true,
        message: "Order already processed",
        skipped: true,
      });
    }

    // ✅ AGGIUNGI ALLA CODA (invece di processare direttamente)
    const queueId = await OrderQueue.enqueue(order);

    // ✅ Avvia worker (se non già attivo)
    processQueue().catch((err) => {
      console.error("❌ Errore queue worker:", err);
    });

    // ✅ Rispondi immediatamente a Shopify
    return NextResponse.json({
      ok: true,
      order_number: order.order_number,
      message: "Order queued for processing",
      queue_id: queueId,
    });

  } catch (err: any) {
    console.error("❌ Errore webhook:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

// ✅ WORKER: Processa coda in sequenza (1 ordine alla volta)
async function processQueue() {
  console.log("🔄 Queue worker started...");

  while (true) {
    const job = await OrderQueue.dequeue();

    if (!job) {
      console.log("✅ Coda vuota, worker termina");
      break;
    }

    console.log(`🔨 Processing ordine #${job.order.order_number} dalla coda`);

    try {
      await processOrderWithLock(job.order, job.id);
      await OrderQueue.complete(job.id, { success: true });
    } catch (err: any) {
      console.error(`❌ Errore processing ordine ${job.id}:`, err);
      await OrderQueue.fail(job.id, err);
    }

    // Delay tra ordini
    await delay(1000);
  }
}

// ✅ PROCESSING con LOCK transazionale su stock
async function processOrderWithLock(order: any, queueId: string) {
  const results: any[] = [];
  const errors: any[] = [];

  // Crea log iniziale
  const logDocRef = await adminDb.collection("orders_stock_log").add({
    order_number: order.order_number,
    order_id: order.id,
    queue_id: queueId,
    status: "processing",
    started_at: new Date().toISOString(),
    total_items: order.line_items.length,
  });

  try {
    const locationsRes = await shopify2.api("/locations.json");
    const locationId = locationsRes.locations?.[0]?.id;

    if (!locationId) {
      throw new Error("Location ID non trovato");
    }

    for (const item of order.line_items) {
      const variantIdGrafica = item.variant_id;
      const quantity = item.quantity;

      console.log(`\n📝 Processing: ${item.title} (${variantIdGrafica}, Qty: ${quantity})`);

      try {
        const assocSnap = await adminDb
          .collection("graphics_blanks")
          .doc(String(variantIdGrafica))
          .get();

        if (!assocSnap.exists) {
          errors.push({
            variant_id: variantIdGrafica,
            title: item.title,
            error: "Associazione non trovata",
          });
          continue;
        }

        const assoc = assocSnap.data();
        const blankKey = assoc.blank_key;
        const blankVariantId = assoc.blank_variant_id;

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
            error: "Blank variant non trovata",
          });
          continue;
        }

        const blankVariantDoc = variantsSnap.docs[0];

        // ✅ TRANSAZIONE per evitare race condition
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

        // Aggiorna grafiche (con throttling)
        const allGraphicsSnap = await adminDb
          .collection("graphics_blanks")
          .where("blank_key", "==", blankKey)
          .where("blank_variant_id", "==", blankVariantId)
          .get();

        console.log(`🎨 ${allGraphicsSnap.size} grafiche da aggiornare`);

        const graphicsUpdated: any[] = [];
        const graphicsErrors: any[] = [];

        let callCount = 0;
        const DELAY_MS = 600;

        for (const graphicDoc of allGraphicsSnap.docs) {
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
              numero_grafica: graphicData.numero_grafica,
            });

            console.log(`  ✅ ${graphicVariantId} → ${newStock.new}`);
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
                // Fallthrough to error
              }
            }

            graphicsErrors.push({
              variant_id: graphicVariantId,
              product_title: graphicData.product_title || "N/A",
              size: graphicData.size,
              color: graphicData.color,
              error: err.message,
            });
          }
        }

        results.push({
          order_item: item.title,
          blank_key: blankKey,
          size: assoc.size,
          color: assoc.color,
          previous_stock: newStock.previous,
          new_stock: newStock.new,
          quantity_ordered: quantity,
          graphics_updated: graphicsUpdated,
          graphics_errors: graphicsErrors,
        });

      } catch (err: any) {
        errors.push({
          variant_id: variantIdGrafica,
          title: item.title,
          error: err.message,
        });
      }
    }

    // Salva risultato finale
    await logDocRef.update({
      status: "completed",
      processed_at: new Date().toISOString(),
      successful: results.length,
      errors_count: errors.length,
      results,
      error_details: errors,
    });

    console.log(`✅ Ordine #${order.order_number} completato`);

  } catch (err: any) {
    console.error("❌ Errore processing:", err);
    
    await logDocRef.update({
      status: "failed",
      processed_at: new Date().toISOString(),
      error: err.message,
      critical: true,
    });

    throw err;
  }
}

