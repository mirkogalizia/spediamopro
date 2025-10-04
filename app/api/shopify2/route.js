// /app/api/shopify2/route.js
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!from || !to) {
      return new Response(
        JSON.stringify({ ok: false, error: "'from' e 'to' sono obbligatori" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 👉 SECONDO STORE (usa le env _2 su Vercel)
    const shopDomain  = process.env.SHOPIFY_DOMAIN_2;
    const accessToken = process.env.SHOPIFY_TOKEN_2;

    if (!shopDomain || !accessToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "Env mancanti: SHOPIFY_DOMAIN_2 / SHOPIFY_TOKEN_2" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiVersion   = "2023-10";
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

    return new Response(
      JSON.stringify({ ok: true, store: 2, orders: allOrders }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || "Errore interno server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
