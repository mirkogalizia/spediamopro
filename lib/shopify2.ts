// lib/shopify2.ts
const domain = process.env.SHOPIFY_DOMAIN_2!;
const token = process.env.SHOPIFY_TOKEN_2!;

if (!domain) throw new Error("Missing SHOPIFY_DOMAIN_2");
if (!token) throw new Error("Missing SHOPIFY_TOKEN_2");

// ✅ Usa la versione API corrente (supportata fino a ottobre 2026)
const BASE_URL = `https://${domain}/admin/api/2025-10`;

export const shopify2 = {
  async api(endpoint: string, options: any = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Shopify2 API error", {
        status: res.status,
        endpoint,
        error: err,
      });
      throw new Error(`Shopify2 API Error ${res.status}: ${endpoint}`);
    }

    return res.json();
  },

  async getProduct(productId: number) {
    return this.api(`/products/${productId}.json`);
  },

  async listProducts() {
    return this.api(`/products.json?limit=250`);
  },
};
