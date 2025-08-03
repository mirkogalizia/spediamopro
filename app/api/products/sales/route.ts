import { NextResponse } from "next/server";

// Usa solo variabili ambiente!
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";

// Mappa prodotto madre BLANKS: <nome tipologia> → <product_id>
const BLANKS_PRODUCTS: Record<string, string> = {
  "t shirt": "10086015861002",
  "felpa cappuccio": "10086022217994",
};

const TYPE_ALIASES: Record<string, string> = {
  "felpa hoodie": "felpa cappuccio",
  "felpa cappuccio": "felpa cappuccio",
  "t shirt": "t shirt",
  "t-shirt": "t shirt",
  // aggiungi altri alias se serve
};

function getPageInfo(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

// Normalizza variante in formato "taglia/colore" lowercase senza spazi extra
function normalizeVariant(variant: string) {
  return variant
    .toLowerCase()
    .replace(/\s*\/\s*/, "/")
    .trim();
}

export async function GET() {
  try {
    // 1) Mappa product_id → tipologia normalizzata
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

    // 2) Scarica stock blanks e normalizza varianti
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
        const normVar = normalizeVariant(variant.title);
        blanksStockMap[type][normVar] = variant.inventory_quantity || 0;
      }
    }

    // 3) Scarica venduto per tipologia e variante normalizzata (ultimi 30 giorni)
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
          if (!(type in BLANKS_PRODUCTS)) continue; // Solo blanks configurati
          const variantNorm = normalizeVariant(item.variant_title || "unknown");
          soldMap[type] = soldMap[type] || {};
          soldMap[type][variantNorm] = (soldMap[type][variantNorm] || 0) + (item.quantity || 0);
        }
      }
      orderCursor = getPageInfo(res.headers.get("link"));
    } while (orderCursor);

    // 4) Combina stock e venduto (venduto = 0 se assente)
    const rows = Object.entries(blanksStockMap).map(([tipologia, stockVariants]) => {
      const soldVariants = soldMap[tipologia] || {};
      return {
        tipologia,
        variants: Object.entries(stockVariants).map(([variant, stock]) => ({
          variante: variant,
          stock,
          venduto: soldVariants[variant] || 0,
        })),
      };
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
