export default async function handler(req, res) {
  console.log("=== CHIAMATA A FULFILL-ORDER ===");
  console.log("BODY:", req.body);
  console.log("ENV TOKEN PRESENTE:", !!process.env.SHOPIFY_TOKEN);
  console.log("ENV DOMAIN:", process.env.SHOPIFY_DOMAIN);

  if (req.method !== "POST") {
    console.log("ERRORE: chiamata non POST");
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;

  if (!SHOPIFY_TOKEN || !SHOPIFY_DOMAIN) {
    console.log("ERRORE: variabili ambiente mancanti");
    return res.status(500).json({ error: "Variabili ambiente Shopify mancanti" });
  }

  const { orderId, trackingNumber, carrierName } = req.body;
  if (!orderId) {
    console.log("ERRORE: orderId mancante!");
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    // 1. Ottieni fulfillmentOrder e lineItems
    const orderGID = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
    console.log("orderGID usato:", orderGID);

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

    let data = null;
    try {
      data = await graphqlRes.json();
      console.log("RISPOSTA GRAPHQL:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.log("ERRORE PARSING RISPOSTA SHOPIFY GRAPHQL:", err);
      return res.status(502).json({ error: "Errore parsing risposta Shopify (GraphQL)", details: err.message });
    }

    if (!data?.data?.order?.fulfillmentOrders?.edges?.length) {
      console.log("NESSUN FULFILLMENT ORDER TROVATO", data);
      return res.status(400).json({ error: "Nessun fulfillment order trovato per questo ordine" });
    }

    const fulfillmentOrder = data.data.order.fulfillmentOrders.edges[0].node;
    const fulfillment_order_id = Number(fulfillmentOrder.legacyResourceId);
    const fulfillment_order_line_items = fulfillmentOrder.lineItems.edges.map(edge => ({
      id: Number(edge.node.legacyResourceId),
      quantity: edge.node.lineItem.quantity
    }));

    console.log("FULFILLMENT ORDER ID:", fulfillment_order_id);
    console.log("LINE ITEMS:", fulfillment_order_line_items);

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

    console.log("PAYLOAD FULFILL:", JSON.stringify(payload, null, 2));

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
      console.log("RISPOSTA FULFILL REST:", JSON.stringify(restData, null, 2));
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