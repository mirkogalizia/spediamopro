export async function POST(req) {
  try {
    const { SHOPIFY_TOKEN, SHOPIFY_DOMAIN } = process.env;
    const body = await req.json();

    const { orderId, trackingNumber, carrierName } = body;
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Recupera fulfillmentOrderId e lineItems con GraphQL
    const orderGID = orderId.toString().startsWith("gid://") ? orderId : `gid://shopify/Order/${orderId}`;
    const graphqlRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query getFulfillmentOrders($orderId: ID!) {
            order(id: $orderId) {
              fulfillmentOrders(first: 5) {
                edges {
                  node {
                    id
                    lineItems(first: 10) {
                      edges {
                        node {
                          id
                          lineItem {
                            id
                            quantity
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
        variables: { orderId: orderGID }
      })
    });

    const data = await graphqlRes.json();
    if (!data?.data?.order?.fulfillmentOrders?.edges?.length) {
      return new Response(
        JSON.stringify({ error: "Nessun fulfillment order trovato per questo ordine" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fulfillmentOrder = data.data.order.fulfillmentOrders.edges[0].node;
    const fulfillment_order_id = Number(fulfillmentOrder.id.split("/").pop());
    const fulfillment_order_line_items = fulfillmentOrder.lineItems.edges.map(edge => ({
      id: Number(edge.node.id.split("/").pop()),
      quantity: edge.node.lineItem.quantity
    }));

    // 2. Crea fulfillment via REST API
    const payload = {
      fulfillment: {
        notify_customer: true,
        ...(trackingNumber && {
          tracking_info: {
            number: trackingNumber,
            company: carrierName || "",
          }
        }),
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id,
            fulfillment_order_line_items
          }
        ]
      }
    };

    const restRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-10/fulfillments.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const restData = await restRes.json();

    if (!restRes.ok || restData.errors) {
      return new Response(
        JSON.stringify({ error: restData.errors || restData || "Errore fulfillment Shopify" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Successo!
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