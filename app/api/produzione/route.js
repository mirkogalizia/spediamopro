// /app/api/produzione/route.js

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

    const accessToken = process.env.SHOPIFY_TOKEN;
    const shopDomain = process.env.SHOPIFY_DOMAIN;
    const apiVersion = "2023-10";

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

    const produzioneRows = [];

    for (const order of allOrders) {
      for (const item of order.line_items) {
        const variantId = item.variant_id;

        // Chiamata extra per recuperare immagine variante
        const variantRes = await fetch(
          `https://${shopDomain}/admin/api/${apiVersion}/variants/${variantId}.json`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        let variantImage = null;
        if (variantRes.ok) {
          const variantJson = await variantRes.json();
          variantImage = variantJson?.variant?.image?.src || null;
        }

        produzioneRows.push({
          tipo_prodotto: item.product_type || item.title.split(" ")[0],
          taglia: item.option1 || "",
          colore: item.option2 || "",
          grafica: item.title,
          immagine: variantImage,
          order_name: order.name,
          created_at: order.created_at,
          variant_id: variantId,
        });
      }
    }

    // Ordina per data crescente
    produzioneRows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return new Response(
      JSON.stringify({ ok: true, produzione: produzioneRows }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || "Errore interno server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}