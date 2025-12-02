import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const showOnlyErrors = searchParams.get("errors") === "true";

    // ✅ USA started_at invece di received_at (più affidabile)
    let query = adminDb
      .collection("orders_stock_log")
      .orderBy("started_at", "desc")
      .limit(limit);

    const logsSnap = await query.get();

    console.log(`📋 Trovati ${logsSnap.size} log`);

    const logs: any[] = [];
    let totalItemsProcessed = 0;
    let totalGraphicsUpdated = 0;
    let totalGraphicsErrors = 0;

    logsSnap.forEach((doc) => {
      const data = doc.data();
      
      console.log(`Log ${doc.id}: status=${data.status}, order=${data.order_number}`);
      
      // Filtra solo errori se richiesto
      if (showOnlyErrors && (!data.items_failed || data.items_failed === 0)) {
        return;
      }

      // Calcola stats dalle nuove strutture
      let graphicsUpdatedCount = 0;
      let graphicsErrorsCount = 0;

      if (data.items) {
        Object.values(data.items).forEach((item: any) => {
          if (item.graphics_updated) {
            graphicsUpdatedCount += item.graphics_updated.length;
          }
          if (item.graphics_errors) {
            graphicsErrorsCount += item.graphics_errors.length;
          }
        });
      }

      // Converti in formato compatibile con UI esistente
      const results: any[] = [];
      if (data.items) {
        Object.entries(data.items).forEach(([variantId, item]: [string, any]) => {
          results.push({
            order_item: item.blank_key || "N/A",
            variant_id_grafica: variantId,
            blank_key: item.blank_key,
            size: item.size,
            color: item.color,
            previous_stock: item.previous_stock,
            new_stock: item.new_stock,
            quantity_ordered: (item.previous_stock || 0) - (item.new_stock || 0),
            graphics_updated: item.graphics_updated?.length || 0,
            graphics_errors_count: item.graphics_errors?.length || 0,
          });
        });
      }

      totalItemsProcessed += data.items_processed || 0;
      totalGraphicsUpdated += graphicsUpdatedCount;
      totalGraphicsErrors += graphicsErrorsCount;

      logs.push({
        id: doc.id,
        order_number: data.order_number,
        order_id: data.order_id,
        processed_at: data.completed_at || data.started_at || data.received_at,
        total_items: data.total_items,
        successful: data.items_success || 0,
        errors_count: data.items_failed || 0,
        results: results,
        error_details: data.errors ? Object.values(data.errors) : [],
        critical: data.critical_error ? true : false,
      });
    });

    console.log(`✅ Ritorno ${logs.length} log al client`);

    return NextResponse.json({
      ok: true,
      logs,
      stats: {
        total_orders: logs.length,
        total_items_decremented: totalItemsProcessed,
        total_graphics_updated: totalGraphicsUpdated,
        total_errors: totalGraphicsErrors,
      },
    });
  } catch (err: any) {
    console.error("❌ Errore API stock-logs:", err);
    return NextResponse.json(
      { ok: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
