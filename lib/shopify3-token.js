// /lib/shopify3-token.js

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_3;
const CLIENT_ID = process.env.SHOPIFY_API_KEY_3;
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET_3;

// Cache token in memoria
let tokenCache = {
  access_token: null,
  expires_at: null,
};

export async function getShopify3Token() {
  // Token ancora valido?
  if (tokenCache.access_token && tokenCache.expires_at > Date.now()) {
    const expires_in = Math.floor((tokenCache.expires_at - Date.now()) / 1000);
    console.log(`✅ Token cached, valido per altri ${expires_in}s`);
    return tokenCache.access_token;
  }

  // Token scaduto → richiedi nuovo
  console.log("⚠️ Token scaduto, richiedo nuovo...");

  const tokenRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials"
      })
    }
  );

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    console.error("❌ Shopify OAuth error:", error);
    throw new Error(`OAuth failed: ${tokenRes.status} - ${error}`);
  }

  const data = await tokenRes.json();

  if (!data.access_token) {
    throw new Error("Nessun access_token nella risposta");
  }

  // Salva in cache (24h - 1min)
  const expires_in = data.expires_in || 86400;
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + expires_in * 1000 - 60000,
  };

  console.log(`✅ Token ottenuto! Valido per ${expires_in}s (${Math.floor(expires_in / 3600)}h)`);

  return tokenCache.access_token;
}
