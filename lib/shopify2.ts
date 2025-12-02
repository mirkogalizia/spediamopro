// lib/shopify2.ts

const SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN_2!;
const ADMIN_TOKEN = process.env.SHOPIFY_TOKEN_2!;

// 🔥 Debug automatico se mancano env
if (!SHOP_DOMAIN || !ADMIN_TOKEN) {
  console.error("❌ Shopify2 ENV ERROR", {
    SHOP_DOMAIN,
    ADMIN_TOKEN: ADMIN_TOKEN ? "OK" : "MISSING",
  });
}

const API_VERSION = "2024-04";

/**
 * Wrapper per chiamare Shopify Admin REST API (store 2)
 */
export const shopify2 = {
  async api(endpoint: string, options: any = {}) {
    const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}${endpoint}`;

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_TOKEN,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Shopify2 API error", res.status, text);
      throw new Error(`Shopify2 API Error ${res.status}`);
    }

    return res.json();
  },

  // ✔ Get prodotto singolo
  async getProduct(productId: number) {
    const r = await this.api(`/products/${productId}.json`);
    return r.product;
  },

  // ✔ Get tutti i prodotti
  async getAllProducts() {
    const r = await this.api(`/products.json?limit=250`);
    return r.products || [];
  },
};