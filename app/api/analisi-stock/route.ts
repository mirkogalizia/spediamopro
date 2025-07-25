// app/api/analisi-stock/route.ts

import { NextResponse } from "next/server";

// Prendi tutto da ENV, assicurati di averle settate su Vercel:
// SHOPIFY_ACCESS_TOKEN, SHOPIFY_SHOP_DOMAIN, SHOPIFY_API_VERSION
const {
  SHOPIFY_ACCESS_TOKEN,
  SHOPIFY_SHOP_DOMAIN,
  SHOPIFY_API_VERSION,
} = process.env;

if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_SHOP_DOMAIN || !SHOPIFY_API_VERSION) {
  throw new Error(
    "Missing one of SHOPIFY_ACCESS_TOKEN, SHOPIFY_SHOP_DOMAIN or SHOPIFY_API_VERSION env vars"
  );
}

// Calcola data di inizio (ultimi 30 giorni)
const START_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// Mappa dei prodotti “blanks” (prendi gli ID da ENV se vuoi configurarli dinamicamente)
const BLANKS_PRODUCTS: Record<string, string> = {
  "t shirt": process.env.BLANKS_TSHIRT_ID || "9707778343253",
  "felpa cappuccio": process.env.BLANKS_HOODIE_ID || "9702366118229",
};

// Normalizzazione dei tipi
const TYPE_ALIASES: Record<string, string> = {
  "felpa hoodie": "felpa cappuccio",
  "felpa cappuccio": "felpa cappuccio",
  "t shirt": "t shirt",
  "t-shirt": "t shirt",
};

/** Estrae page_info dal header Link */
function getPageInfo(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

/** Normalizza la stringa variante in "taglia/colore" lowercase */
function normalizeVariant(variant: string) {
  return variant.toLowerCase().replace(/\s*\/\s*/, "/").trim();
}

export async function GET() {
  try {
    // 1) Costruisci mappa product_id → tipologia normalizzata
    const productTypeMap: Record<string, string> = {};
    let cursor: string | null = null;

    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?fields=id,product_type&limit=250`;
      if (cursor) url += `&page_info=${cursor}`;

      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
        cache: "no-store",
      });
      if (!res.ok) break;

      const { products } = await res.json();
      for (const p of products || []) {
        const raw = (p.product_type || "unknown").toLowerCase().trim();
        productTypeMap[p.id] = TYPE_ALIASES[raw] || raw;
      }
      cursor = getPageInfo(res.headers.get("link"));
    } while (cursor);

    // 2) Scarica stock per ciascun blank e normalizza varianti
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

      const { product } = await res.json();
      blanksStockMap[type] = {};
      for (const v of product.variants || []) {
        const norm = normalizeVariant(v.title);
        blanksStockMap[type][norm] = v.inventory_quantity ?? 0;
      }
    }

    // 3) Scarica venduto per tipologia+variante negli ultimi 30gg
    const soldMap: Record<string, Record<string, number>> = {};
    cursor = null;
    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&created_at_min=${START_DATE}&fields=line_items,product_id,variant_title&limit=250`;
      if (cursor) url += `&page_info=${cursor}`;

      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
        cache: "no-store",
      });
      if (!res.ok) break;

      const { orders } = await res.json();
      for (const order of orders || []) {
        for (const item of order.line_items || []) {
          const type = productTypeMap[item.product_id] || "unknown";
          if (!(type in BLANKS_PRODUCTS)) continue;
          const variantNorm = normalizeVariant(item.variant_title || "");
          soldMap[type] = soldMap[type] || {};
          soldMap[type][variantNorm] =
            (soldMap[type][variantNorm] || 0) + (item.quantity || 0);
        }
      }
      cursor = getPageInfo(res.headers.get("link"));
    } while (cursor);

    // 4) Combina stock e venduto
    const result = Object.entries(blanksStockMap).map(
      ([tipologia, stockVariants]) => ({
        tipologia,
        variants: Object.entries(stockVariants).map(
          ([variante, stock]) => ({
            variante,
            stock,
            venduto: soldMap[tipologia]?.[variante] ?? 0,
          })
        ),
      })
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
