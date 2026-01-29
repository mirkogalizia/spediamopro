// /app/api/shopify3/route.js

// ========================================
// Helper: ottieni token sempre valido (OAuth refresh automatico)
// ========================================
async function getShopifyToken() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/shopify3/auth`);
  const data = await res.json();

  if (!data.success) {
    throw new Error("Impossibile ottenere token Shopify: " + data.error);
  }

  console.log(`✅ Token Shopify valido per altri ${data.expires_in}s`);
  return data.access_token;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return new Response(
        JSON.stringify({ ok: false, error: "'from' e 'to' sono obbligatori" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ← Usa token OAuth fresco (si rinnova automaticamente ogni 24h)
    const accessToken = await getShopifyToken();
    const shopDomain = process.env.SHOPIFY_DOMAIN_3;
    const apiVersion = "2025-10";

    const createdAtMin = `${from}T00:00:00Z`;
    const createdAtMax = `${to}T23:59:59Z`;
    const baseParams = new URLSearchParams({
      status: "open",
      financial_status: "paid",
      limit: "250",
      created_at_min: createdAtMin,
      created_at_max: createdAtMax,
    });

    let nextUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?${baseParams}`;
    const allOrders = [];

    console.log(`→ Carico ordini Shopify da ${from} a ${to}`);

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Shopify API error ${response.status}: ${errTxt}`);
      }

      const json = await response.json();
      allOrders.push(...(json.orders || []));

      const linkHeader = response.headers.get("Link");
      if (linkHeader) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        nextUrl = match && match[1] ? match[1] : null;
      } else {
        nextUrl = null;
      }
    }

    console.log(`✅ Caricati ${allOrders.length} ordini`);

    return new Response(
      JSON.stringify({ ok: true, orders: allOrders }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("❌ Errore caricamento ordini:", e.message);
    return new Response(
      JSON.stringify({ ok: false, error: e.message || "Errore interno server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
