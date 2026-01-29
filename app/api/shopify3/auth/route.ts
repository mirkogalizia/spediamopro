// /app/api/shopify3/auth/route.js
import { NextResponse } from "next/server";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_3;
const CLIENT_ID = process.env.SHOPIFY_API_KEY_3;
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET_3;

// Cache token in memoria (o usa database/Redis in produzione per multi-instance)
let tokenCache = {
  access_token: null,
  expires_at: null,
};

export async function GET(req) {
  try {
    // Token ancora valido? Restituiscilo
    if (tokenCache.access_token && tokenCache.expires_at > Date.now()) {
      const expires_in = Math.floor((tokenCache.expires_at - Date.now()) / 1000);
      console.log(`✅ Token Shopify cached, valido per altri ${expires_in}s`);
      return NextResponse.json({
        success: true,
        access_token: tokenCache.access_token,
        expires_in,
      });
    }

    // Token scaduto → richiedi nuovo
    console.log("⚠️ Token scaduto, richiedo nuovo token con CLIENT_ID:", CLIENT_ID?.substring(0, 10) + "...");

    const tokenRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      }
    );

    if (!tokenRes.ok) {
      const error = await tokenRes.text();
      console.error("❌ Shopify OAuth error:", error);
      throw new Error(`Shopify OAuth failed: ${tokenRes.status} ${error}`);
    }

    const data = await tokenRes.json();

    if (!data.access_token) {
      throw new Error("Nessun access_token nella risposta Shopify");
    }

    // Salva in cache (24h = 86400s, -1min safety)
    const expires_in = data.expires_in || 86400;
    tokenCache = {
      access_token: data.access_token,
      expires_at: Date.now() + expires_in * 1000 - 60000,
    };

    console.log(`✅ Nuovo token ottenuto! Valido per ${expires_in}s (${Math.floor(expires_in / 3600)}h)`);

    return NextResponse.json({
      success: true,
      access_token: tokenCache.access_token,
      expires_in,
    });
  } catch (err) {
    console.error("❌ Errore getShopifyToken:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
