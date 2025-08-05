export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  // --- CONFIG (personalizza come variabili ambiente) ---
 const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || "imjsqk-my.myshopify.com";

  const { orderId, trackingNumber, carrierName } = req.body;
  if (!orderId) return res.status(400).json({ error: "Missing orderId" });

  try {
    // 1. --- Ottieni fulfillmentOrder & lineItems ---
    const orderGID = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
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
                          lineItem { quantity }
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
    if (!data?.data?.order?.fulfillmentOrders?.edges?.length)
      return res.status(400).json({ error: "Nessun fulfillment order trovato per questo ordine" });

    const fulfillmentOrder = data.data.order.fulfillmentOrders.edges[0].node;
    const fulfillment_order_id = Number(fulfillmentOrder.legacyResourceId);
    const fulfillment_order_line_items = fulfillmentOrder.lineItems.edges.map(edge => ({
      id: Number(edge.node.legacyResourceId),
      quantity: edge.node.lineItem.quantity
    }));

    // 2. --- Crea fulfillment via REST API ---
    const body = {
      fulfillment: {
        notify_customer: true,
        ...(trackingNumber && {
          tracking_info: {
            number: trackingNumber,
            company: carrierName || "",
            // url: puoi aggiungere il link del corriere se vuoi!
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
      body: JSON.stringify(body)
    });

    let restData = {};
    try {
      restData = await restRes.json();
    } catch (err) {
      // La risposta non è JSON!
      return res.status(502).json({ error: "Risposta non valida da Shopify REST", details: err.message });
    }

    if (!restRes.ok || restData.errors) {
      return res.status(400).json({ error: restData.errors || restData || "Errore fulfillment Shopify" });
    }

    // --- OK! ---
    return res.status(200).json({ success: true, data: restData });
  } catch (err) {
    // Cattura qualsiasi errore JS
    return res.status(500).json({ error: err.message || "Errore generico nel backend" });
  }
}