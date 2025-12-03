// lib/shopify2.ts
//---------------------------------------------------------------
//  Shopify2 SDK DEFINITIVO (REST + GraphQL)
//---------------------------------------------------------------

// 🔐 ENV
const domain = process.env.SHOPIFY_DOMAIN_2!;
const token  = process.env.SHOPIFY_TOKEN_2!;

if (!domain) throw new Error("Missing SHOPIFY_DOMAIN_2");
if (!token)  throw new Error("Missing SHOPIFY_TOKEN_2");

// 🔧 Sanitizzazione dominio
const cleanDomain = domain
  .trim()
  .replace(/^https?:\/\//, "")   // rimuove https://
  .replace(/\/$/, "")            // rimuove / finale
  .replace(/\s+/g, "");          // rimuove spazi

// 🔗 Endpoint base
const API_VERSION = "2025-10";
const BASE_URL = `https://${cleanDomain}/admin/api/${API_VERSION}`;

//---------------------------------------------------------------
// ⭐ HELPER: Concatena endpoint
//---------------------------------------------------------------
function resolveEndpoint(endpoint: string) {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

//---------------------------------------------------------------
// 🔵 REST CLIENT — shopify2.api()
//---------------------------------------------------------------
async function api(endpoint: string, options: any = {}) {
  const cleanEndpoint = resolveEndpoint(endpoint);
  const url = `${BASE_URL}${cleanEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ Shopify REST Error", {
      status: res.status,
      endpoint: cleanEndpoint,
      error: err,
    });

    throw new Error(
      `REST Error ${res.status} on ${cleanEndpoint}: ${err}`
    );
  }

  return res.json();
}

//---------------------------------------------------------------
// 🔵 GRAPHQL CLIENT — shopify2.graphql()
//---------------------------------------------------------------
async function graphql(query: string) {
  const url = `${BASE_URL}/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Shopify GraphQL HTTP error:", text);

    throw new Error(
      `GraphQL HTTP Error ${res.status}: ${text}`
    );
  }

  const data = await res.json();

  if (data.errors) {
    console.error("❌ Shopify GraphQL internal errors:", data.errors);
    throw new Error(
      "GraphQL Internal Error: " + JSON.stringify(data.errors)
    );
  }

  return data.data;
}

//---------------------------------------------------------------
//  ENDPOINTS UTILI READY TO USE
//---------------------------------------------------------------
async function getProduct(productId: number) {
  return api(`/products/${productId}.json`);
}

async function listProducts(limit: number = 250) {
  return api(`/products.json?limit=${limit}`);
}

async function getProductsByIds(productIds: number[]) {
  const ids = productIds.join(",");
  return api(`/products.json?ids=${ids}`);
}

async function getProductVariant(variantId: number) {
  return api(`/variants/${variantId}.json`);
}

async function getInventoryLevel(inventoryItemId: number, locationId: number) {
  return api(
    `/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`
  );
}

//---------------------------------------------------------------
//  EXPORT FINALE DEL CLIENT
//---------------------------------------------------------------
export const shopify2 = {
  api,
  graphql,
  getProduct,
  listProducts,
  getProductsByIds,
  getProductVariant,
  getInventoryLevel,
};
