export default async function handler(req, res) {
  console.log("CHIAMATA A FULFILL-ORDER", req.body);

  if (req.method !== "POST") 
    return res.status(405).json({ error: "Only POST allowed" });

  const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;

  const { orderId, trackingNumber, carrierName } = req.body;
  if (!orderId) {
    console.log("ERRORE: orderId mancante!");
    return res.status(400).json({ error: "Missing orderId" });
  }

  // Helper per estrarre l’ID numerico dal GID
  function extractNumber(gid) {
    if (!gid) return null;
    return Number(gid.split('/').pop());
  }

  try {
    // 1. Ottieni fulfillmentOrder e lineItems
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
                    status
                    lineItems(first: 10) {
                      edges {
                        node {
                          id
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

    let data = null;
    try {
      data = await graphqlRes.json();
    } catch (err) {
      console.log("ERRORE PARSING RISPOSTA SHOPIFY GRAPHQL:", err);
      return res.status(502).json({ error: "Errore parsing risposta Shopify (GraphQL)", details: err.message });
    }

    if (!data?.data?.order?.fulfillmentOrders?.edges?.length) {
      console.log("NESSUN FULFILLMENT ORDER TROVATO", data);
      return res.status(400).json({ error: "Nessun fulfillment order trovato per questo ordine" });
    }

    // Trova il primo fulfillmentOrder ancora "aperto"
    const fulfillmentOrderNode = data.data.order.fulfillmentOrders.edges
      .map(e => e.node)
      .find(node => ["OPEN", "IN_PROGRESS", "SCHEDULED", "UNFULFILLED"].includes(node.status));
    if (!fulfillmentOrderNode) {
      return res.status(400).json({ error: "Nessun fulfillment order aperto trovato" });
    }

    const fulfillment_order_id = extractNumber(fulfillmentOrderNode.id);
    const fulfillment_order_line_items = fulfillmentOrderNode.lineItems.edges.map(edge => ({
      id: extractNumber(edge.node.id),
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
            // url: puoi aggiungere qui il tracking link se vuoi
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

    let restData = null;
    try {
      restData = await restRes.json();
    } catch (err) {
      console.log("ERRORE PARSING RISPOSTA SHOPIFY REST:", err);
      return res.status(502).json({ error: "Risposta non valida da Shopify REST", details: err.message });
    }

    if (!restRes.ok || restData.errors) {
      console.log("ERRORE DA SHOPIFY REST:", restData);
      return res.status(400).json({ error: restData.errors || restData || "Errore fulfillment Shopify" });
    }

    // Successo!
    console.log("FULFILLMENT COMPLETATO CON SUCCESSO", restData);
    return res.status(200).json({ success: true, data: restData });

  } catch (err) {
    console.log("CATCH GENERICO API FULFILL:", err);
    return res.status(500).json({ error: err.message || "Errore generico nel backend" });
  }
}