import { kpiRange } from "../../lib/kpi";

function ymd(d){ return new Date(d).toISOString().slice(0,10); }
function startOfDayISO(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || ymd(startOfDayISO(new Date()));
    const to   = url.searchParams.get("to")   || ymd(startOfDayISO(new Date()));
    const withDays = url.searchParams.get("days") === "1";

    const agg = await kpiRange(from, to);
    const resp = {
      ok: true,
      period: { from, to },
      totals: {
        shipments: agg.totalCount,
        totalAmount: +agg.totalSum.toFixed(2),
        avgCost: agg.totalCount ? +agg.avg.toFixed(2) : 0,
        currency: "EUR",
      },
    };
    if (withDays) resp.days = agg.days;
    return new Response(JSON.stringify(resp), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}