// app/api/forecast/stock/route.ts
import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// --- Vercel: serve una ENV FIREBASE_SERVICE_ACCOUNT_JSON col JSON del service account ---
if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Shopify ENV ---
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-04";

// --- Parametri default ---
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_SERVICE_DAYS = 15;
const DEFAULT_SAFETY_FACTOR = 0.15; // 15% scorta sicurezza
const DEFAULT_MIN_BATCH = 2;

// --- Utils: normalizza tipo in "hoodie" | "tshirt" ---
const normalizeTipo = (tipoRaw: string) => {
  const t = (tipoRaw || "").toLowerCase();
  if (t.includes("hood") || t.includes("felpa") || t.includes("sweat")) return "hoodie";
  if (t.includes("tee") || t.includes("t-shirt") || t.includes("tshirt")) return "tshirt";
  // fallback: prova a dedurre da variant title
  return t.includes("maglia") ? "tshirt" : "other";
};

// --- Estrai chiave grafica stabile dal title: rimuove solo tipologia/brand/rumore minimo ---
// (puoi allungare le liste brand/rumore nel tempo)
const PRODUCT_TYPE_TOKENS = ["tshirt","t","shirt","t-shirt","tee","felpa","hoodie","crewneck","sweatshirt","maglia"];
const BRAND_TOKENS = ["notre","deltanove","kiss","my","airs","moneymakerz","notforresale","not","for","resale"];
const SHIP_TOKENS = ["express","shipment","shipping","24h","h24","24hx","x24h"];
const STOP_TOKENS = ["the","of","and","with","by","for","a","an","con","di","da","per","la","il","lo","le","gli","un","una","uno","club","collection","capsule"];
const SEASON_RE = /^(aw|fw|ss|sp|w|s|f)\d{2}$/i;

const tokenize = (s: string) =>
  (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

const extractGraphicKey = (title: string) => {
  const drop = new Set([...PRODUCT_TYPE_TOKENS, ...BRAND_TOKENS, ...SHIP_TOKENS, ...STOP_TOKENS]);
  const toks = tokenize(title).filter(t => {
    if (drop.has(t)) return false;
    if (SEASON_RE.test(t)) return false;
    if (/\d/.test(t)) return false;
    return t.length >= 3;
  });
  if (toks.length === 0) return "";
  // prendi 1-2 token più distintivi
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const t of toks) if (!seen.has(t)) { seen.add(t); uniq.push(t); }
  const ranked = [...uniq].sort((a,b) => (b.length - a.length) || a.localeCompare(b));
  return ranked.slice(0, 2).join("-");
};

// --- Shopify fetch helpers ---
async function shopifyGet(pathAndQuery: string) {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/${pathAndQuery}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
    method: "GET",
    // cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Shopify ${res.status} ${res.statusText}: ${body}`);
  }
  return res;
}

async function fetchOrdersWindow(createdAtMinISO: string, createdAtMaxISO: string) {
  const orders: any[] = [];
  let nextUrl =
    `orders.json?status=any&financial_status=paid&limit=250` +
    `&created_at_min=${encodeURIComponent(createdAtMinISO)}` +
    `&created_at_max=${encodeURIComponent(createdAtMaxISO)}` +
    `&fields=id,name,created_at,line_items`;

  while (nextUrl) {
    const res = await shopifyGet(nextUrl);
    const json = await res.json();
    orders.push(...(json.orders || []));
    const linkHeader = res.headers.get("Link") || res.headers.get("link") || "";
    const m = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
    nextUrl = m?.[1]
      ?.replace(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/`, "") ?? "";
  }
  return orders;
}

// --- Firestore: stock stampati corrente (mappa sku_key -> qty) ---
async function getPrintedStockMap() {
  const snap = await db.collection("stock_items").get();
  const map = new Map<string, number>();
  snap.forEach(d => {
    const data = d.data() as any;
    const qty = Number(data.qty || 0);
    if (!qty) return;
    const sku = String(data.sku_key || "").toLowerCase();
    if (!sku) return;
    map.set(sku, (map.get(sku) || 0) + qty);
  });
  return map;
}

// --- costruisci sku_key: tipo|grafica_key|taglia|colore ---
const buildSkuKey = (tipo: string, graficaKey: string, taglia: string, colore: string) =>
  `${tipo.toLowerCase()}|${graficaKey.toLowerCase()}|${String(taglia).toLowerCase()}|${String(colore).toLowerCase()}`;

// --- handler ---
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lookbackDays = Number(url.searchParams.get("lookback") || DEFAULT_LOOKBACK_DAYS);
    const serviceDays = Number(url.searchParams.get("service") || DEFAULT_SERVICE_DAYS);
    const safetyFactor = Number(url.searchParams.get("safety") || DEFAULT_SAFETY_FACTOR);
    const minBatch = Number(url.searchParams.get("min_batch") || DEFAULT_MIN_BATCH);

    const now = new Date();
    const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const createdAtMin = from.toISOString();
    const createdAtMax = now.toISOString();

    // 1) Storico ordini nel periodo
    const orders = await fetchOrdersWindow(createdAtMin, createdAtMax);

    // 2) Aggrega domanda per (tipo, grafica_key, taglia, colore)
    type Key = string;
    type Agg = { tipo: string; grafica_key: string; taglia: string; colore: string; demand: number; };
    const demandMap = new Map<Key, Agg>();

    for (const o of orders) {
      const items = Array.isArray(o.line_items) ? o.line_items : [];
      for (const it of items) {
        const tipo = normalizeTipo(it.product_type || it.title || "");
        if (tipo !== "hoodie" && tipo !== "tshirt") continue; // ci concentriamo su felpe/tshirt
        const grafica_key = extractGraphicKey(it.title || "") || extractGraphicKey(it.name || "");
        if (!grafica_key) continue;
        const taglia = String(it.variant_title || it.option1 || "").trim();
        const colore = String(it.option2 || "").trim();

        const k = buildSkuKey(tipo, grafica_key, taglia, colore);
        if (!demandMap.has(k)) {
          demandMap.set(k, { tipo, grafica_key, taglia, colore, demand: 0 });
        }
        demandMap.get(k)!.demand += Number(it.quantity || 1);
      }
    }

    // 3) Stock stampati attuale per sottrarre dal target
    const printedMap = await getPrintedStockMap();

    // 4) Costruisci raccomandazioni (forecast → target → to_produce)
    const recosHoodie: any[] = [];
    const recosTshirt: any[] = [];

    demandMap.forEach((agg, k) => {
      const dailyRate = agg.demand / lookbackDays;              // media/die
      const forecast = dailyRate * serviceDays;                  // 15 giorni
      const safety = Math.round(forecast * safetyFactor);        // scorta sicurezza
      const target = Math.ceil(forecast + safety);               // target stock stampato
      const inStock = printedMap.get(k) || 0;                    // stock stampati attuale
      const toProduce = Math.max(0, target - inStock);

      if (toProduce >= minBatch) {
        const row = {
          sku_key: k,
          tipo: agg.tipo,
          grafica_key: agg.grafica_key,
          taglia: agg.taglia,
          colore: agg.colore,
          demand_lookback: agg.demand,
          daily_rate: +dailyRate.toFixed(3),
          forecast_service_days: +forecast.toFixed(2),
          safety,
          target,
          in_stock_printed: inStock,
          to_produce,
        };
        if (agg.tipo === "hoodie") recosHoodie.push(row);
        else recosTshirt.push(row);
      }
    });

    // ordina per priorità (più “buchi” prima)
    const sortFn = (a: any, b: any) =>
      b.to_produce - a.to_produce ||
      b.daily_rate - a.daily_rate;

    recosHoodie.sort(sortFn);
    recosTshirt.sort(sortFn);

    return NextResponse.json({
      ok: true,
      params: { lookbackDays, serviceDays, safetyFactor, minBatch },
      hoodie: recosHoodie,
      tshirt: recosTshirt,
    });
  } catch (e: any) {
    console.error("forecast error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}