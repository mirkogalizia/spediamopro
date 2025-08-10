// app/api/products/sales/route.ts
import { NextResponse } from "next/server";

// Disattiva qualsiasi cache server/CDN
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";

// ID dei 2 prodotti blanks (come nel tuo codice)
const BLANKS_PRODUCTS: Record<string, string> = {
  "t shirt": "10086015861002",
  "felpa cappuccio": "10086022217994",
};

// Alias tipologia (come nel tuo codice)
const TYPE_ALIASES: Record<string, string> = {
  "felpa hoodie": "felpa cappuccio",
  "felpa cappuccio": "felpa cappuccio",
  "t shirt": "t shirt",
  "t-shirt": "t shirt",
};

// ---- Utils identiche ma con chiave canonica taglia|colore ----
const TAGLIE_SET = new Set(["xs", "s", "m", "l", "xl"]);

function getPageInfo(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

function normalizeStr(s: string | undefined | null) {
  return (s || "").trim().toLowerCase();
}

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
  return `${size}|${color}`; // es.: "m|nero"
}

function prettyFromKey(key: string) {
  const [sizeRaw = "", colorRaw = ""] = key.split("|");
  const size = sizeRaw.toUpperCase();
  const color = colorRaw ? colorRaw.charAt(0).toUpperCase() + colorRaw.slice(1) : "";
  return `${size} / ${color}`;
}

export async function GET() {
  try {
    // 1) product_id → tipologia (come facevi tu)
    const productTypeMap: Record<string, string> = {};
    let productCursor: string | null = null;
    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?fields=id,product_type&limit=250`;
      if (productCursor) url += `&page_info=${productCursor}`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = await res.json();
      for (const p of data.products || []) {
        const rawType = (p.product_type || "unknown").toLowerCase().trim();
        const normalizedType = TYPE_ALIASES[rawType] || rawType;
        productTypeMap[String(p.id)] = normalizedType;
      }
      productCursor = getPageInfo(res.headers.get("link"));
    } while (productCursor);

    // 2) STOCK blanks: identico al tuo, ma memorizzato su chiave canonica
    const blanksStockMap: Record<string, Record<string, number>> = {};
    for (const [type, prodId] of Object.entries(BLANKS_PRODUCTS)) {
      const res = await fetch(
        `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${prodId}.json`,
        {
          headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
          cache: "no-store",
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      blanksStockMap[type] = {};
      for (const variant of data.product.variants) {
        const key = canonicalVariant(variant.title); // <— QUI la magia
        const qty = typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : 0;
        blanksStockMap[type][key] = qty;
      }
    }

    // 3) VENDUTO 30 giorni: identico al tuo, ma su chiave canonica
    const START_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const soldMap: Record<string, Record<string, number>> = {};
    let orderCursor: string | null = null;
    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&created_at_min=${START_DATE}&fields=line_items,product_id,variant_title&limit=250`;
      if (orderCursor) url += `&page_info=${orderCursor}`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = await res.json();
      for (const order of data.orders || []) {
        for (const item of order.line_items || []) {
          const typeRaw = productTypeMap[String(item.product_id)] || "unknown";
          const type = TYPE_ALIASES[typeRaw] || typeRaw;
          if (!(type in BLANKS_PRODUCTS)) continue;

          const key = canonicalVariant(item.variant_title || ""); // <— idem
          soldMap[type] = soldMap[type] || {};
          soldMap[type][key] = (soldMap[type][key] || 0) + Number(item.quantity || 0);
        }
      }
      orderCursor = getPageInfo(res.headers.get("link"));
    } while (orderCursor);

    // 4) Output: riconverto la chiave canonica in "M / Nero" per la tua UI
    const rows = Object.entries(blanksStockMap).map(([tipologia, stockByKey]) => {
      const soldByKey = soldMap[tipologia] || {};
      return {
        tipologia,
        variants: Object.entries(stockByKey).map(([key, stock]) => ({
          variante: prettyFromKey(key),          // es. "M / Nero"
          stock,
          venduto: soldByKey[key] || 0,
        })),
      };
    });

    return NextResponse.json(rows, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, {
      status: 500,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
    });
  }
}
