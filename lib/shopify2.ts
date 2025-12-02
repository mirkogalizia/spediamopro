// lib/shopify2.ts
const DOMAIN = process.env.SHOPIFY2_DOMAIN!;
const TOKEN = process.env.SHOPIFY2_TOKEN!;
const API_VERSION = "2023-10";

async function api(endpoint: string, options: any = {}) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Shopify API Error: ${res.status} - ${t}`);
  }

  return res.json();
}

/** 🔥 Scarica un prodotto */
async function getProduct(productId: number) {
  const data = await api(`products/${productId}.json`);
  return data.product;
}

/** 🔥 Scarica tutti i prodotti */
async function getAllProducts() {
  const data = await api(`products.json?limit=250`);
  return data.products;
}

export const shopify2 = {
  api,
  getProduct,
  getAllProducts,
};