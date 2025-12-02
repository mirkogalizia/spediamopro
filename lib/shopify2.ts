// lib/shopify2.ts

const SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN_2;
const SHOP_TOKEN = process.env.SHOPIFY_TOKEN_2;
const API_VERSION = "2023-10";

/**
 * Wrapper generico per chiamare Shopify Store 2
 * @param endpoint es: "/products.json?limit=250"
 * @param options fetch options addizionali (metodo, body, ecc.)
 */
export async function shopify2(endpoint: string, options: any = {}) {
  if (!SHOP_DOMAIN || !SHOP_TOKEN) {
    throw new Error("Missing Shopify 2 environment variables");
  }

  const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": SHOP_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Shopify2 API error:", text);
    throw new Error(`Shopify2 API Error: ${res.status}`);
  }

  return res.json();
}

/**
 * Shortcut: ottiene tutti i prodotti del negozio in modo paginato
 */
export async function fetchAllProductsShopify2() {
  let products: any[] = [];
  let endpoint = `/products.json?limit=250`;
  let keepGoing = true;

  while (keepGoing) {
    const res = await shopify2(endpoint);

    if (res.products) {
      products = [...products, ...res.products];
    }

    // Controllo header "Link" per paginazione
    const link = (res as any).headers?.get("link");

    if (link && link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match?.[1]) {
        const nextUrl = new URL(match[1]);
        endpoint = nextUrl.pathname + nextUrl.search;
      } else {
        keepGoing = false;
      }
    } else {
      keepGoing = false;
    }
  }

  return products;
}