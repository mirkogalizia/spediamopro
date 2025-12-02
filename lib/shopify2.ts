// lib/shopify2.ts
const domain = process.env.SHOPIFY_DOMAIN_2!;
const token = process.env.SHOPIFY_TOKEN_2!;

if (!domain) throw new Error("Missing SHOPIFY_DOMAIN_2");
if (!token) throw new Error("Missing SHOPIFY_TOKEN_2");

// Sanitizza il dominio rimuovendo https://, slash finali e spazi
const cleanDomain = domain
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .replace(/\s+/g, '');

const BASE_URL = `https://${cleanDomain}/admin/api/2025-10`;

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
        url,
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

  async listProducts(limit: number = 250) {
    return this.api(`/products.json?limit=${limit}`);
  },

  async getProductsByIds(productIds: number[]) {
    const ids = productIds.join(',');
    return this.api(`/products.json?ids=${ids}`);
  },

  async getProductVariant(variantId: number) {
    return this.api(`/variants/${variantId}.json`);
  },

  async getInventoryLevel(inventoryItemId: number, locationId: number) {
    return this.api(`/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`);
  },
};
