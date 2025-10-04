// /app/api/shopify2/fulfill-order/route.js
export async function POST(req) {
  try {
    const shopDomain  = process.env.SHOPIFY_DOMAIN_2;
    const accessToken = process.env.SHOPIFY_TOKEN_2;

    if (!shopDomain || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Env mancanti: SHOPIFY_DOMAIN_2 / SHOPIFY_TOKEN_2" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { orderId, trackingNumber, carrierName } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1) Recupera Fulfillment Orders via GraphQL (API 2024-10)
    const apiVersion = "2024-10";
    const orderGID = orderId.toString().startsWith("gid://")
      ? orderId
      : `gid://shopify/Order/${orderId}`;

    const graphqlRes = await fetch(
      `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query getFulfillmentOrders($orderId: ID!) {
              order(id: $orderId) {
                id
                name
                fulfillmentOrders(first: 10) {
                  edges {
                    node {
                      id
                      lineItems(first: 50) {
                        edges {
                          node {
                            id
                            remainingQuantity
                            lineItem {
                              id
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: { orderId: orderGID },
        }),
      }
    );

    const gql = await graphqlRes.json();

    if (!graphqlRes.ok || gql.errors) {
      return new Response(
        JSON.stringify({ error: gql.errors || "Errore GraphQL Shopify" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const edges = gql?.data?.order?.fulfillmentOrders?.edges || [];
    if (!edges.length) {
      return new Response(
        JSON.stringify({ error: "Nessun fulfillment order trovato per questo ordine" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Prepara il payload REST aggregando tutte le FO con righe rimanenti > 0
    const line_items_by_fulfillment_order = [];

    for (const foEdge of edges) {
      const fo = foEdge.node;
      const foIdNum = Number(fo.id.split("/").pop());
      const items = (fo.lineItems?.edges || [])
        .map(e => ({
          id: Number(e.node.id.split("/").pop()),
          quantity: Number(e.node.remainingQuantity || 0),
        }))
        .filter(it => it.quantity > 0);

      if (items.length > 0) {
        line_items_by_fulfillment_order.push({
          fulfillment_order_id: foIdNum,
          fulfillment_order_line_items: items,
        });
      }
    }

    if (line_items_by_fulfillment_order.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nessuna riga evadibile (remainingQuantity = 0)" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Crea il fulfillment via REST (2024-10)
    const payload = {
      fulfillment: {
        notify_customer: true,
        ...(trackingNumber && {
          tracking_info: {
            number: trackingNumber,
            company: carrierName || "",
          },
        }),
        line_items_by_fulfillment_order,
      },
    };

    const restRes = await fetch(
      `https://${shopDomain}/admin/api/${apiVersion}/fulfillments.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const restData = await restRes.json().catch(() => ({}));

    if (!restRes.ok || restData?.errors) {
      return new Response(
        JSON.stringify({ error: restData?.errors || restData || "Errore fulfillment Shopify" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: restData }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Errore generico nel backend" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}