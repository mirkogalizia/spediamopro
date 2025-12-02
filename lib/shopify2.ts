// lib/shopify2.ts
const SHOPIFY_DOMAIN_2 = process.env.SHOPIFY_DOMAIN_2!;
const SHOPIFY_TOKEN_2 = process.env.SHOPIFY_TOKEN_2!;
const API_VERSION = "2023-10";

function buildUrl(endpoint: string) {
  return `https://${SHOPIFY_DOMAIN_2}/admin/api/${API_VERSION}${endpoint}`;
}

export const shopify2 = {
  async api(endpoint: string, options: any = {}) {
    const url = buildUrl(endpoint);

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN_2,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorTxt = await res.text();
      console.error("❌ Shopify2 API error", res.status, errorTxt);
      throw new Error(`Shopify2 API Error ${res.status}`);
    }

    return res.json();
  },

  async getProduct(productId: number) {
    return this.api(`/products/${productId}.json`);
  },

  async getAllProducts() {
    return this.api(`/products.json?limit=250`);
  }
};