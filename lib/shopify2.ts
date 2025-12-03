// lib/shopify2.ts

const domain = process.env.SHOPIFY_DOMAIN_2!;
const token = process.env.SHOPIFY_TOKEN_2!;

if (!domain) throw new Error("Missing SHOPIFY_DOMAIN_2");
if (!token) throw new Error("Missing SHOPIFY_TOKEN_2");

// sanitize domain
const cleanDomain = domain
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const BASE_URL = `https://${cleanDomain}/admin/api/2025-10`;

export const shopify2 = {
  async api(endpoint: string, options: any = {}) {
    const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${clean}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {})
      },
      cache: "no-store"
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Shopify2 API error", {
        status: res.status,
        url,
        endpoint: clean,
        error: err
      });
      throw new Error(`Shopify2 API error ${res.status}: ${clean}`);
    }

    return res.json();
  },

  async graphql(query: string, variables = {}) {
    const res = await fetch(`${BASE_URL}/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Shopify2 GraphQL error", err);
      throw new Error("GraphQL error");
    }

    return res.json();
  }
};
