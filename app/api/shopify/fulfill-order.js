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
                    lineItems(first: 10) {
                      edges {
                        node {
                          id
                          lineItem { id quantity }
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

    const fulfillmentOrder = data.data.order.fulfillmentOrders.edges[0].node;
    const fulfillment_order_id = Number(fulfillmentOrder.id.split('/').pop());
    const fulfillment_order_line_items = fulfillmentOrder.lineItems.edges.map(edge => ({
      id: Number(edge.node.id.split('/').pop()),
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

    // --- FIX: controlla tipo di risposta ---
    let restData = null;
    const contentType = restRes.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      restData = await restRes.json();
    } else {
      const text = await restRes.text();
      console.log("ATTENZIONE: Shopify REST ha risposto senza JSON:", text);
      return res.status(502).json({ error: "Shopify REST non ha risposto in JSON", details: text });
    }

    if (!restRes.ok || restData.errors) {
      console.log("ERRORE DA SHOPIFY REST:", restData);
      return res.status(400).json({ error: restData.errors || restData || "Errore fulfillment Shopify" });
    }

    console.log("FULFILLMENT COMPLETATO CON SUCCESSO", restData);
    return res.status(200).json({ success: true, data: restData });

  } catch (err) {
    console.log("CATCH GENERICO API FULFILL:", err);
    return res.status(500).json({ error: err.message || "Errore generico nel backend" });
  }
}