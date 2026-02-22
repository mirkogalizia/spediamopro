// /app/api/shopify3/fulfill-order/route.js
import { getShopify3Token } from "@/lib/shopify3-token";

export async function POST(req) {
  try {
    const SHOPIFY_TOKEN = await getShopify3Token(); // Token OAuth fresco
    const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_3;
    const body = await req.json();

    const { orderId, trackingNumber, carrierName } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`→ Evadi ordine ${orderId} con tracking ${trackingNumber}`);

    const orderGID = orderId.toString().startsWith("gid://")
      ? orderId
      : `gid://shopify/Order/${orderId}`;

    // ============================
    // 1) TENTATIVO: Fulfillment Orders (nuovo flusso)
    // ============================
    const graphqlRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2025-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query getFulfillmentOrders($orderId: ID!) {
              order(id: $orderId) {
                id
                name
                financialStatus
                displayFulfillmentStatus
                fulfillmentOrders(first: 5) {
                  edges {
                    node {
                      id
                      status
                      lineItems(first: 10) {
                        edges {
                          node {
                            id
                            quantity
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
          variables: { orderId: orderGID },
        }),
      }
    );

    const data = await graphqlRes.json();
    console.log(
      "DEBUG getFulfillmentOrders response:",
      JSON.stringify(data, null, 2)
    );

    const orderNode = data?.data?.order || null;

    // Se l'ordine proprio non esiste
    if (!orderNode) {
      console.error("❌ Ordine non trovato in GraphQL");
      return new Response(
        JSON.stringify({ error: "Ordine non trovato in Shopify" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const foEdges = orderNode.fulfillmentOrders?.edges || [];

    if (foEdges.length > 0) {
      // ===== ABBIAMO FULFILLMENT ORDERS → flusso standard (come prima) =====
      const fulfillmentOrder = foEdges[0].node;

      const fulfillment_order_id = Number(
        fulfillmentOrder.id.split("/").pop()
      );

      const fulfillment_order_line_items =
        fulfillmentOrder.lineItems.edges.map((edge) => ({
          id: Number(edge.node.id.split("/").pop()),
          quantity: edge.node.quantity,
        }));

      const payload = {
        fulfillment: {
          notify_customer: true,
          ...(trackingNumber && {
            tracking_info: {
              number: trackingNumber,
              company: carrierName || "",
            },
          }),
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id,
              fulfillment_order_line_items,
            },
          ],
        },
      };

      const restRes = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2025-10/fulfillments.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const restData = await restRes.json();

      if (!restRes.ok || restData.errors) {
        console.error("❌ Errore fulfillment (FO):", restData.errors || restData);
        return new Response(
          JSON.stringify({
            error:
              restData.errors || restData || "Errore fulfillment Shopify",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Ordine evaso (Fulfillment Orders)");

      return new Response(
        JSON.stringify({ success: true, data: restData, mode: "FO" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ============================
    // 2) FALLBACK: vecchia REST /fulfillments.json con order_id
    // ============================
    console.warn(
      "⚠️ Nessun FulfillmentOrder. Uso fallback REST /fulfillments.json con order_id."
    );

    const fallbackPayload = {
      fulfillment: {
        order_id: Number(orderId),
        notify_customer: true,
        tracking_number: trackingNumber || "",
        tracking_company: carrierName || "",
        // tracking_urls opzionale, Shopify la genera spesso da sola
      },
    };

    const fbRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2025-10/fulfillments.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackPayload),
      }
    );

    const fbData = await fbRes.json();

    if (!fbRes.ok || fbData.errors) {
      console.error("❌ Errore fallback fulfillment:", fbData.errors || fbData);
      return new Response(
        JSON.stringify({
          error:
            fbData.errors ||
            fbData ||
            "Errore fulfillment Shopify (fallback REST)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Ordine evaso (fallback REST order_id)");

    return new Response(
      JSON.stringify({ success: true, data: fbData, mode: "FALLBACK" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Errore evasione:", err.message);
    return new Response(
      JSON.stringify({
        error: err.message || "Errore generico nel backend",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

