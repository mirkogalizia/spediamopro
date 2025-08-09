import { NextResponse } from "next/server";

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";

// ID prodotto "blanks" per tipologia
const BLANKS_PRODUCTS: Record<string, string> = {
  "t shirt": "10086015861002",
  "felpa cappuccio": "10086022217994",
};

// Alias per uniformare il product_type
const TYPE_ALIASES: Record<string, string> = {
  "felpa hoodie": "felpa cappuccio",
  "felpa cappuccio": "felpa cappuccio",
  "t shirt": "t shirt",
  "t-shirt": "t shirt",
};

function getPageInfo(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

// set di taglie riconosciute (puoi estendere se usi altre)
const SIZE_ORDER = ["xxs","xs","s","m","l","xl","xxl","2xl","3xl","xxxl"];
const SIZE_SET = new Set(SIZE_ORDER);

// normalizza spazi e slash
function normalizeVariantBase(variant: string) {
  return (variant || "")
    .toLowerCase()
    .replace(/\s*\/\s*/g, "/")   // <-- globale
    .replace(/\s+/g, " ")
    .trim();
}

// canonizza in "taglia / colore"
function canonVariant(variant: string) {
  const base = normalizeVariantBase(variant);
  const parts = base.split("/").map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) return "sconosciuta / sconosciuto";
  if (parts.length === 1) {
    const p = parts[0];
    if (SIZE_SET.has(p)) return `${p} / sconosciuto`;
    return `sconosciuta / ${p}`;
  }

  const [a, b] = parts;
  const aIsSize = SIZE_SET.has(a);
  const bIsSize = SIZE_SET.has(b);

  if (aIsSize && !bIsSize) return `${a} / ${b}`;
  if (!aIsSize && bIsSize) return `${b} / ${a}`;

  // se entrambi (o nessuno) sono taglia, mantieni ordine ma in formato canonico
  return `${a} / ${b}`;
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
        const rawType = String(p.product_type || "unknown").toLowerCase().trim();
        const normalizedType = TYPE_ALIASES[rawType] || rawType;
        productTypeMap[String(p.id)] = normalizedType;
      }
      productCursor = getPageInfo(res.headers.get("link"));
    } while (productCursor);

    // 2) Scarica stock blanks e canonizza varianti
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
      for (const variant of data.product.variants || []) {
        // variant.title è tipicamente "Size / Color" ma canonizziamo comunque
        const canon = canonVariant(variant.title || "");
        blanksStockMap[type][canon] = Number(variant.inventory_quantity ?? 0);
      }
    }

    // 3) Scarica venduto ultimi 30 giorni e aggrega per tipologia + variante canonica
    const START_DATE = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const soldMap: Record<string, Record<string, number>> = {};
    let orderCursor: string | null = null;
    do {
      let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=250&status=any&created_at_min=${START_DATE}&fields=line_items,product_id,variant_title`;
      // Se vuoi solo ordini pagati, usa (e rimuovi status=any):
      // let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=250&financial_status=paid&created_at_min=${START_DATE}&fields=line_items,product_id,variant_title`;

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

          const variantCanon = canonVariant(item.variant_title || "");
          soldMap[type] ??= {};
          soldMap[type][variantCanon] = (soldMap[type][variantCanon] || 0) + Number(item.quantity || 0);
        }
      }
      orderCursor = getPageInfo(res.headers.get("link"));
    } while (orderCursor);

    // 4) Combina stock (authoritative) e venduto (aggregato) per ogni tipologia
    const rows = Object.entries(blanksStockMap).map(([tipologia, stockVariants]) => {
      const soldVariants = soldMap[tipologia] || {};
      return {
        tipologia,
        variants: Object.entries(stockVariants).map(([variantCanon, stock]) => ({
          variante: variantCanon,                // sempre "taglia / colore" lowercase
          stock,
          venduto: soldVariants[variantCanon] || 0,
        })),
      };
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
