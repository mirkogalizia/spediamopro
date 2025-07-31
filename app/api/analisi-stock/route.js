// app/api/analisi-stock/route.js
import { NextResponse } from "next/server";

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION;
const START_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const BLANKS_PRODUCTS = {
  "t shirt": "9707778343253",
  "felpa cappuccio": "9702366118229",
};

const TYPE_ALIASES = {
  "felpa hoodie": "felpa cappuccio",
  "felpa cappuccio": "felpa cappuccio",
  "t shirt": "t shirt",
  "t-shirt": "t shirt",
};

function getPageInfo(link) {
  if (!link) return null;
  const m = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return m ? m[1] : null;
}

function normalizeVariant(variant) {
  return variant
    .toLowerCase()
    .replace(/\s*\/\s*/, "/")
    .trim();
}

export async function GET() {
  try {
    // 1) mappa product_id → tipologia
    const productTypeMap = {};
    let cursor = null;
    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?fields=id,product_type&limit=250`;
      if (cursor) url += `&page_info=${cursor}`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = await res.json();
      (data.products || []).forEach(p => {
        const raw = (p.product_type||"").toLowerCase().trim();
        productTypeMap[p.id] = TYPE_ALIASES[raw]||raw;
      });
      cursor = getPageInfo(res.headers.get("link"));
    } while (cursor);

    // 2) stock blanks
    const blanksStockMap = {};
    await Promise.all(
      Object.entries(BLANKS_PRODUCTS).map(async ([type, prodId]) => {
        const res = await fetch(
          `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${prodId}.json`,
          { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN }, cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        blanksStockMap[type] = {};
        (json.product.variants || []).forEach(v => {
          blanksStockMap[type][normalizeVariant(v.title)] = v.inventory_quantity || 0;
        });
      })
    );

    // 3) venduto
    const soldMap = {};
    cursor = null;
    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&created_at_min=${START_DATE}&fields=line_items,product_id,variant_title&limit=250`;
      if (cursor) url += `&page_info=${cursor}`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = await res.json();
      (data.orders || []).forEach(order =>
        (order.line_items || []).forEach(item => {
          const type = productTypeMap[item.product_id] || "";
          if (!(type in BLANKS_PRODUCTS)) return;
          const v = normalizeVariant(item.variant_title || "");
          soldMap[type] = soldMap[type] || {};
          soldMap[type][v] = (soldMap[type][v] || 0) + (item.quantity || 0);
        })
      );
      cursor = getPageInfo(res.headers.get("link"));
    } while (cursor);

    // 4) combiniamo stock e venduto
    const rows = Object.entries(blanksStockMap).map(([tipologia, stockVars]) => ({
      tipologia,
      variants: Object.entries(stockVars).map(([varn, stock]) => ({
        variante: varn,
        stock,
        venduto: soldMap[tipologia]?.[varn] || 0,
      })),
    }));

    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


