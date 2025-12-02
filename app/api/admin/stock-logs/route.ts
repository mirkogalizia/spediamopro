import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const showOnlyErrors = searchParams.get("errors") === "true";

    let query = adminDb
      .collection("orders_stock_log")
      .orderBy("processed_at", "desc")
      .limit(limit);

    const logsSnap = await query.get();

    const logs: any[] = [];
    let totalDecremented = 0;
    let totalGraphicsUpdated = 0;
    let totalErrors = 0;

    logsSnap.forEach((doc) => {
      const data = doc.data();
      
      // Filtra solo errori se richiesto
      if (showOnlyErrors && (!data.errors_count || data.errors_count === 0)) {
        return;
      }

      // Calcola stats
      if (data.results) {
        data.results.forEach((r: any) => {
          totalDecremented += r.quantity_ordered || 0;
          totalGraphicsUpdated += r.graphics_updated || 0;
        });
      }
      
      totalErrors += data.errors_count || 0;

      logs.push({ 
        id: doc.id, 
        ...data 
      });
    });

    return NextResponse.json({ 
      ok: true, 
      logs,
      stats: {
        total_orders: logs.length,
        total_items_decremented: totalDecremented,
        total_graphics_updated: totalGraphicsUpdated,
        total_errors: totalErrors,
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
