// pages/api/shopify/fulfill-order.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  const { orderId, trackingNumber, carrierName } = req.body;
  if (!orderId) return res.status(400).json({ error: "Missing orderId" });

  try {
    // 1. Prendi i fulfillmentOrder e lineItems della order
    const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
    const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;

    // GraphQL query per fulfillmentOrder + lineItems
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
                    legacyResourceId
                    lineItems(first: 10) {
                      edges {
                        node {
                          id
                          legacyResourceId
                          lineItem {
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
        variables: { orderId: orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}` }
      })
    });

    const data = await graphqlRes.json();
    if (!data.data) throw new Error("No data from Shopify API");

    const fulfillmentOrders = data.data.order.fulfillmentOrders.edges.map(e => e.node);

    // Prendi i dati necessari dal primo fulfillmentOrder (o gestisci più FO se serve)
    const fulfillmentOrder = fulfillmentOrders[0];
    const fulfillment_order_id = Number(fulfillmentOrder.legacyResourceId);
    const fulfillment_order_line_items = fulfillmentOrder.lineItems.edges.map(edge => ({
      id: Number(edge.node.legacyResourceId),
      quantity: edge.node.lineItem.quantity
    }));

    // 2. Crea il fulfillment via REST
    const restRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-10/fulfillments.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fulfillment: {
          notify_customer: true,
          tracking_info: trackingNumber ? {
            number: trackingNumber,
            company: carrierName || "",
            // url: (eventuale url tracking, opzionale)
          } : undefined,
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id,
              fulfillment_order_line_items
            }
          ]
        }
      })
    });

    const restData = await restRes.json();

    if (!restRes.ok) {
      return res.status(400).json({ error: restData.errors || "Errore fulfillment" });
    }

    return res.status(200).json({ success: true, data: restData });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Errore generico" });
  }
}