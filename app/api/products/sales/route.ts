// app/api/products/sales/route.ts
import { NextResponse } from "next/server";

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";

// ——— ID dei BLANKS da cui leggere lo STOCK reale ———
const BLANKS_PRODUCTS: Record<string, string> = {
  "t shirt": "10086015861002",
  "felpa cappuccio": "10086022217994",
};

// ——— Riconoscimento tipologia dal TITOLO (parziale, tollerante) ———
// Aggiungi/ritocca pattern se ti servono nuove varianti di naming.
const TYPE_MATCHERS: Array<{ type: "t shirt" | "felpa cappuccio"; patterns: RegExp[] }> = [
  {
    type: "t shirt",
    patterns: [
      /\bt[\s\-]?shirt\b/i,   // "t-shirt", "t shirt", "tshirt"
      /\btshirt\b/i,
      /\btee\b/i,             // opzionale
      /\bmaglietta\b/i,       // opzionale
    ],
  },
  {
    type: "felpa cappuccio",
    patterns: [
      /\bfelpa\s*hoodie\b/i,          // "Felpa Hoodie"
      /\bhoodie\b/i,                  // "Hoodie"
      /\bfelpa\s*con\s*cappuccio\b/i, // "Felpa con cappuccio"
      /\bfelpa\s*cappuccio\b/i,       // "Felpa cappuccio"
    ],
  },
];

const TAGLIE_SET = new Set(["xs", "s", "m", "l", "xl"]);

function normalizeStr(s: string | null | undefined) {
  return (s || "").trim().toLowerCase();
}
function getPageInfo(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

// ——— Size/Color parsing + chiave canonica ———
function parseVarTitle(title: string | null | undefined): { size: string; color: string } {
  const raw = (title ?? "").split("/").map(p => p.trim()).filter(Boolean);
  if (raw.length === 0) return { size: "sconosciuta", color: "sconosciuto" };
  if (raw.length === 1) {
    const t0 = normalizeStr(raw[0]);
    return TAGLIE_SET.has(t0) ? { size: t0, color: "sconosciuto" } : { size: "sconosciuta", color: t0 };
  }
  const a = raw[0], b = raw[1];
  const aIsSize = TAGLIE_SET.has(normalizeStr(a));
  const bIsSize = TAGLIE_SET.has(normalizeStr(b));
  if (aIsSize && !bIsSize) return { size: normalizeStr(a), color: normalizeStr(b || "sconosciuto") };
  if (!aIsSize && bIsSize) return { size: normalizeStr(b), color: normalizeStr(a || "sconosciuto") };
  return { size: normalizeStr(a || "sconosciuta"), color: normalizeStr(b || "sconosciuto") };
}
function canonicalVariant(title: string | null | undefined) {
  const { size, color } = parseVarTitle(title);
  return `${size}|${color}`; // es. "m|nero"
}
function prettyFromKey(key: string) {
  const [sizeRaw = "", colorRaw = ""] = key.split("|");
  const size = sizeRaw.toUpperCase();
  const color = colorRaw ? colorRaw.charAt(0).toUpperCase() + colorRaw.slice(1) : "";
  return `${size} / ${color}`;
}

async function shopifyGET(path: string) {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} - GET ${path} :: ${text}`);
  }
  return res;
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function detectTypeFromTitle(s: string): "t shirt" | "felpa cappuccio" | null {
  for (const matcher of TYPE_MATCHERS) {
    if (matcher.patterns.some(rx => rx.test(s))) return matcher.type;
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    // ——— 1) STOCK dai BLANKS via InventoryLevels ———
    type BlankVariantInfo = { key: string; inventory_item_id: string };
    const blanksByType: Record<string, BlankVariantInfo[]> = {};
    for (const [type, prodId] of Object.entries(BLANKS_PRODUCTS)) {
      const res = await shopifyGET(`/products/${prodId}.json`);
      const data = await res.json();
      const variants = (data.product?.variants || []) as Array<any>;
      blanksByType[type] = variants.map(v => ({
        key: canonicalVariant(v.title),
        inventory_item_id: String(v.inventory_item_id),
      }));
    }

    const allItems = Object.values(blanksByType).flat().map(v => v.inventory_item_id);
    const stockByItem: Record<string, number> = {};
    for (const batch of chunk(allItems, 50)) {
      const res = await shopifyGET(`/inventory_levels.json?inventory_item_ids=${batch.join(",")}`);
      const data = await res.json();
      for (const lvl of data.inventory_levels || []) {
        const id = String(lvl.inventory_item_id);
        stockByItem[id] = (stockByItem[id] || 0) + Number(lvl.available ?? 0);
      }
    }

    const blanksStockMap: Record<string, Record<string, number>> = {};
    for (const [type, list] of Object.entries(blanksByType)) {
      blanksStockMap[type] = {};
      for (const v of list) {
        blanksStockMap[type][v.key] = stockByItem[v.inventory_item_id] || 0;
      }
    }

    // ——— 2) VENDUTO ultimi 30 giorni basato su TITOLO parziale ———
    const START_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const soldMap: Record<string, Record<string, number>> = {};
    const debugHits: any[] = [];
    let orderCursor: string | null = null;

    do {
      let path = `/orders.json?status=any&financial_status=paid&created_at_min=${encodeURIComponent(
        START_DATE
      )}&fields=cancelled_at,line_items&limit=250`;
      if (orderCursor) path += `&page_info=${orderCursor}`;

      const res = await shopifyGET(path);
      const data = await res.json();

      for (const order of data.orders || []) {
        if (order.cancelled_at) continue;

        for (const item of order.line_items || []) {
          // titolo completo disponibile in name (es: "<Product title> - <Variant>")
          const text = `${item.name || ""} ${item.title || ""}`.toLowerCase();
          const detected = detectTypeFromTitle(text);
          if (!detected) {
            if (debug) debugHits.push({ skip: true, reason: "no-type", text });
            continue;
          }

          const key = canonicalVariant(item.variant_title || "");
          const qty = Number(item.quantity || 0);
          if (qty <= 0) continue;

          soldMap[detected] = soldMap[detected] || {};
          soldMap[detected][key] = (soldMap[detected][key] || 0) + qty;

          if (debug) debugHits.push({ type: detected, key, qty, text });
        }
      }

      orderCursor = getPageInfo(res.headers.get("link"));
    } while (orderCursor);

    // ——— 3) Output verso il frontend ———
    const rows = Object.entries(blanksStockMap).map(([tipologia, stockByKey]) => {
      const soldByKey = soldMap[tipologia] || {};
      return {
        tipologia,
        variants: Object.entries(stockByKey).map(([key, stock]) => ({
          variante: prettyFromKey(key),
          stock,
          venduto: soldByKey[key] || 0,
        })),
      };
    });

    return NextResponse.json(debug ? { rows, __debug: debugHits.slice(0, 200) } : rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
