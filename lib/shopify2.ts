// lib/shopify2.ts
const DOMAIN = process.env.SHOPIFY_DOMAIN_2!;
const TOKEN = process.env.SHOPIFY_TOKEN_2!;

if (!DOMAIN) throw new Error("Missing SHOPIFY_DOMAIN_2");
if (!TOKEN) throw new Error("Missing SHOPIFY_TOKEN_2");

const BASE = `https://${DOMAIN}/admin/api/2023-10`;

export const shopify2 = {
  async api(path: string, options: any = {}) {
    const url = `${BASE}${path}`;

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Shopify2 API error", res.status, text);
      throw new Error(`Shopify2 API Error ${res.status}`);
    }

    return res.json();
  },

  async listProducts() {
    return this.api(`/products.json?limit=250`);
  },

  async getProduct(id: number) {
    return this.api(`/products/${id}.json`);
  },

  async listVariants(productId: number) {
    return this.api(`/products/${productId}/variants.json`);
  },
};