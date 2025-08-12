import { kv } from "@vercel/kv";

// key helpers
const keyDaily = (d) => `kpi:daily:${d}`;           // Hash: {count, sum}
const keySeen  = (d) => `kpi:seen:${d}`;            // Set: shipment ids

function ymd(dateInput) {
  const d = new Date(dateInput || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Incrementa contatore giornaliero, idempotente per ID
export async function kpiIncrementCount(shipmentId, dateISO) {
  const day = ymd(dateISO);
  if (shipmentId) {
    const added = await kv.sadd(keySeen(day), shipmentId);
    if (added === 0) return; // già contato oggi
  }
  await kv.hincrby(keyDaily(day), "count", 1);
}

// Aggiunge importo alla somma giornaliera, idempotente per ID (per la parte "sum")
export async function kpiAddAmount(shipmentId, amount, dateISO) {
  const day = ymd(dateISO);
  let canAdd = true;
  if (shipmentId) {
    // se non è ancora "seen", aggiungiamo (così conteggio e somma sono coerenti)
    const added = await kv.sadd(keySeen(day), shipmentId);
    // se già visto, aggiungiamo comunque la somma? Dipende dalla tua logica:
    // Per sicurezza, aggiungiamo la somma SOLO alla prima volta:
    if (added === 0) canAdd = false;
  }
  if (canAdd && amount && Number.isFinite(+amount)) {
    await kv.hincrbyfloat(keyDaily(day), "sum", +amount);
  }
}

// Lettura aggregata range
export async function kpiRange(fromYMD, toYMD) {
  const out = [];
  const from = new Date(fromYMD + "T00:00:00");
  const to   = new Date(toYMD   + "T00:00:00");
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const day = ymd(d);
    const hash = await kv.hgetall(keyDaily(day));
    const count = Number(hash?.count || 0);
    const sum   = Number(hash?.sum || 0);
    out.push({ day, count, sum, avg: count ? +(sum / count).toFixed(2) : 0 });
  }
  const totalCount = out.reduce((a, r) => a + r.count, 0);
  const totalSum   = out.reduce((a, r) => a + r.sum, 0);
  const avg = totalCount ? +(totalSum / totalCount).toFixed(2) : 0;
  return { days: out, totalCount, totalSum, avg };
}