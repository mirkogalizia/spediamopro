// /app/api/kpi-spedizioni/route.js
import { getSpediamoToken } from "../../lib/spediamo";

// ---------- Utils date ----------
function toYMD(d) { return d.toISOString().slice(0, 10); }
function startOfDayISO(d) { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString(); }
function endOfDayISO(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x.toISOString(); }

// Somma importo da campi possibili
function readAmount(s) {
  const cand = [s.totalToPay, s.total_price, s.totalPrice, s.grandTotal, s.amount, s.price]
    .filter(v => typeof v === "number");
  return cand.length ? cand[0] : 0;
}

// Heuristics "pagata"
function isPaid(s) {
  const v = (s?.status || s?.paymentStatus || s?.statoPagamento || "").toString().toUpperCase();
  const paidFlags = [
    s?.paid === true,
    s?.isPaid === true,
    v.includes("PAGA"),        // "PAGATA" / "PAGATO"
    v === "PAID"
  ];
  return paidFlags.some(Boolean);
}

// Prova più endpoint noti (fallback robusto) per cercare spedizioni
async function searchShipments(jwt, { fromISO, toISO, offset = 0, limit = 100 }) {
  const base = process.env.SPEDIAMO_BASE_URL || "https://core.spediamopro.com";
  const headers = { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" };

  // 1) POST /api/v1/spedizioni/ricerca (preferito)
  let res = await fetch(`${base}/api/v1/spedizioni/ricerca`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      offset, limit,
      // nomi campo usati comunemente nelle ricerche
      dateFrom: fromISO, dateTo: toISO,
      // se il backend supporta il filtro pagamento:
      // paymentStatus: "PAID", statoPagamento: "PAGATA"
    }),
  });

  if (res.ok) {
    const data = await res.json();
    // normalizzo lista in data.items || data.results || data.spedizioni
    const items = data?.items || data?.results || data?.spedizioni || [];
    return { ok: true, items, total: data?.total || items.length };
  }

  // 2) POST /api/v1/spedizione/ricerca (variante singolare)
  res = await fetch(`${base}/api/v1/spedizione/ricerca`, {
    method: "POST",
    headers,
    body: JSON.stringify({ offset, limit, dateFrom: fromISO, dateTo: toISO }),
  });
  if (res.ok) {
    const data = await res.json();
    const items = data?.items || data?.results || data?.spedizioni || [];
    return { ok: true, items, total: data?.total || items.length };
  }

  // 3) GET /api/v1/spedizioni (con query) — fallback
  const q = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    dateFrom: fromISO,
    dateTo: toISO,
  });
  res = await fetch(`${base}/api/v1/spedizioni?${q.toString()}`, { headers });
  if (res.ok) {
    const data = await res.json();
    const items = data?.items || data?.results || data?.spedizioni || [];
    return { ok: true, items, total: data?.total || items.length };
  }

  // Nessun endpoint ha risposto OK
  const errTxt = await res.text().catch(() => "Search error");
  return { ok: false, error: errTxt };
}

async function getAllShipmentsInRange(jwt, fromISO, toISO) {
  const pageSize = 100;
  let offset = 0;
  let all = [];

  while (true) {
    const r = await searchShipments(jwt, { fromISO, toISO, offset, limit: pageSize });
    if (!r.ok) throw new Error(r.error || "Errore ricerca spedizioni");
    const items = r.items || [];
    all = all.concat(items);
    if (items.length < pageSize) break; // fine paginazione
    offset += pageSize;
  }
  return all;
}

function aggregateKPI(shipments) {
  const paid = shipments.filter(isPaid);
  const count = paid.length;
  const total = paid.reduce((acc, s) => acc + readAmount(s), 0);
  const avg = count > 0 ? total / count : 0;
  return { count, total, avg };
}

export async function GET(req) {
  try {
    const jwt = await getSpediamoToken();

    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from"); // YYYY-MM-DD
    const toParam   = url.searchParams.get("to");   // YYYY-MM-DD
    const includeList = url.searchParams.get("list") === "1"; // opzionale: ritorna elenco

    // Periodo richiesto (default: oggi)
    const today = new Date();
    const fromDate = fromParam ? new Date(`${fromParam}T00:00:00`) : today;
    const toDate   = toParam   ? new Date(`${toParam}T23:59:59`)   : today;

    const fromISO = startOfDayISO(fromDate);
    const toISO   = endOfDayISO(toDate);

    // 30 giorni (incluso oggi)
    const d30 = new Date();
    d30.setDate(d30.getDate() - 29);
    const from30ISO = startOfDayISO(d30);
    const to30ISO   = endOfDayISO(today);

    // Fetch periodo richiesto
    const shipments = await getAllShipmentsInRange(jwt, fromISO, toISO);
    const kpi = aggregateKPI(shipments);

    // Fetch ultimi 30 giorni
    const shipments30 = await getAllShipmentsInRange(jwt, from30ISO, to30ISO);
    const kpi30 = aggregateKPI(shipments30);

    const resp = {
      ok: true,
      period: {
        from: toYMD(new Date(fromISO)),
        to:   toYMD(new Date(toISO)),
      },
      totals: {
        shipments: kpi.count,
        totalAmount: Number(kpi.total.toFixed(2)),
        avgCost: kpi.count ? Number(kpi.avg.toFixed(2)) : 0,
        currency: "EUR", // la maggior parte dei contratti SpediamoPro è in EUR
      },
      last30days: {
        shipments: kpi30.count,
        totalAmount: Number(kpi30.total.toFixed(2)),
        avgCost: kpi30.count ? Number(kpi30.avg.toFixed(2)) : 0,
        currency: "EUR",
        window: { from: toYMD(new Date(from30ISO)), to: toYMD(today) }
      },
    };

    if (includeList) {
      // ritorno una lista minimal per tabella (solo pagate)
      resp.list = shipments
        .filter(isPaid)
        .map(s => ({
          id: s.id || s.shipmentId || s.numeroSpedizione || null,
          carrier: s.corriere || s.carrier || null,
          service: s.service || s.tariffCode || null,
          amount: readAmount(s),
          date: s.createdAt || s.dataCreazione || s.data || null,
          status: s.status || s.paymentStatus || s.statoPagamento || null,
        }));
    }

    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}