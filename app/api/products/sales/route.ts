// app/api/products/sales/route.ts
import { NextResponse } from "next/server";

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";

/**
 * Questi sono i DUE prodotti BLANKS da cui prendere lo STOCK reale.
 * Chiavi = tipologia normalizzata; Valori = product_id del blank (string).
 */
const BLANKS_PRODUCTS: Record<string, string> = {
  "t shirt": "10086015861002",
  "felpa cappuccio": "10086022217994",
};

/**
 * Alias per uniformare i product_type che arrivano da Shopify.
 * Servono a mappare il venduto (ordini) sulla tipologia del blank corretto.
 */
const TYPE_ALIASES: Record<string, string> = {
  "t shirt": "t shirt",
  "t-shirt": "t shirt",
  "tshirt": "t shirt",
  "tee": "t shirt",
  "maglietta": "t shirt",

  "felpa cappuccio": "felpa cappuccio",
  "felpa con cappuccio": "felpa cappuccio",
  "felpa hoodie": "felpa cappuccio",
  "hoodie": "felpa cappuccio",
};

const TAGLIE_ORDINATE = ["xs", "s", "m", "l", "xl"];
const TAGLIE_SET = new Set(TAGLIE_ORDINATE);

// -------------------- Utils comuni --------------------

function normalizeStr(s: string | null | undefined) {
  return (s || "").trim().toLowerCase();
}

function getPageInfo(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

// Parse "Taglia / Colore" anche se invertiti, con maiuscole/spazi variabili
function parseVarTitle(title: string | null | undefined): { size: string; color: string } {
  const raw = (title ?? "").split("/").map(p => p.trim()).filter(Boolean);
  if (raw.length === 0) return { size: "sconosciuta", color: "sconosciuto" };
  if (raw.length === 1) {
    const t0 = normalizeStr(raw[0]);
    return TAGLIE_SET.has(t0)
      ? { size: t0, color: "sconosciuto" }
      : { size: "sconosciuta", color: t0 };
  }
  const a = raw[0], b = raw[1];
  const aIsSize = TAGLIE_SET.has(normalizeStr(a));
  const bIsSize = TAGLIE_SET.has(normalizeStr(b));
  if (aIsSize && !bIsSize) return { size: normalizeStr(a), color: normalizeStr(b || "sconosciuto") };
  if (!aIsSize && bIsSize) return { size: normalizeStr(b), color: normalizeStr(a || "sconosciuto") };
  return { size: normalizeStr(a || "sconosciuta"), color: normalizeStr(b || "sconosciuto") };
}

// Chiave canonica stabile per confrontare stock vs venduto
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

// piccola helper fetch
async function shopifyGET(path: string) {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} on ${path} :: ${body}`);
  }
  return res;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// -------------------- Route --------------------

export async function GET() {
  try {
    // 1) Mappa product_id → tipologia normalizzata (serve per gli ordini)
    const productTypeMap: Record<string, string> = {};
    let productCursor: string | null = null;

    do {
      let path = `/products.json?fields=id,product_type&limit=250`;
      if (productCursor) path += `&page_info=${productCursor}`;
      const res = await shopifyGET(path);
      const data = await res.json();

      for (const p of data.products || []) {
        const rawType = normalizeStr(p.product_type || "unknown");
        const normalizedType = TYPE_ALIASES[rawType] || rawType;
        productTypeMap[String(p.id)] = normalizedType;
      }

      productCursor = getPageInfo(res.headers.get("link"));
    } while (productCursor);

    // 2) STOCK BLANKS → InventoryLevels (accurato anche multi-location)
    //    a) prendo varianti dei 2 prodotti blanks → inventory_item_id + title
    //    b) sommo i livelli per item_id via /inventory_levels.json (batch max 50 id)
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

    //    c) batch degli inventory_item_id → somma available per item
    const allItems = Object.values(blanksByType).flat().map(v => v.inventory_item_id);
    const stockByItem: Record<string, number> = {};
    for (const batch of chunk(allItems, 50)) {
      const path = `/inventory_levels.json?inventory_item_ids=${batch.join(",")}`;
      const res = await shopifyGET(path);
      const data = await res.json();
      // data.inventory_levels: [{inventory_item_id, available, location_id, ...}]
      for (const lvl of data.inventory_levels || []) {
        const id = String(lvl.inventory_item_id);
        const avail = Number(lvl.available ?? 0);
        stockByItem[id] = (stockByItem[id] || 0) + avail;
      }
    }

    //    d) costruisco mappa tipologia → (key size|color → stock)
    const blanksStockMap: Record<string, Record<string, number>> = {};
    for (const [type, list] of Object.entries(blanksByType)) {
      blanksStockMap[type] = {};
      for (const v of list) {
        const qty = stockByItem[v.inventory_item_id] || 0;
        blanksStockMap[type][v.key] = qty;
      }
    }

    // 3) VENDUTO ultimi 30 giorni → solo ordini pagati e non cancellati
    const START_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const soldMap: Record<string, Record<string, number>> = {};
    let orderCursor: string | null = null;

    do {
      let path = `/orders.json?status=any&financial_status=paid&created_at_min=${encodeURIComponent(
        START_DATE
      )}&fields=cancelled_at,line_items,product_id&limit=250`;
      if (orderCursor) path += `&page_info=${orderCursor}`;

      const res = await shopifyGET(path);
      const data = await res.json();

      for (const order of data.orders || []) {
        if (order.cancelled_at) continue;

        for (const item of order.line_items || []) {
          const typeRaw = productTypeMap[String(item.product_id)] || "unknown";
          const type = TYPE_ALIASES[typeRaw] || typeRaw;
          if (!(type in BLANKS_PRODUCTS)) continue; // consideriamo solo le tipologie mappate ai blanks

          const key = canonicalVariant(item.variant_title || "");
          const qty = Number(item.quantity || 0);
          if (!soldMap[type]) soldMap[type] = {};
          soldMap[type][key] = (soldMap[type][key] || 0) + qty;
        }
      }

      orderCursor = getPageInfo(res.headers.get("link"));
    } while (orderCursor);

    // 4) Output per il frontend: [{ tipologia, variants: [{variante, stock, venduto}] }]
    const rows = Object.entries(blanksStockMap).map(([tipologia, stockByKey]) => {
      const soldByKey = soldMap[tipologia] || {};
      return {
        tipologia,
        variants: Object.entries(stockByKey).map(([key, stock]) => ({
          variante: prettyFromKey(key), // es. "M / Nero"
          stock,
          venduto: soldByKey[key] || 0,
        })),
      };
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
