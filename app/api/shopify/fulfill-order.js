import Shopify from '@shopify/shopify-api';

export async function POST(req) {
  try {
    const { orderId, trackingNumber, carrierName } = await req.json();

    if (!orderId || !trackingNumber || !carrierName) {
      return new Response(
        JSON.stringify({ error: "Mancano parametri obbligatori" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new Shopify.Clients.Rest(
      process.env.SHOPIFY_DOMAIN,
      process.env.SHOPIFY_TOKEN
    );

    const fulfillment = {
      fulfillment: {
        location_id: parseInt(process.env.SHOPIFY_LOCATION_ID, 10),
        tracking_number: trackingNumber,
        tracking_company: carrierName,
        notify_customer: true,
        line_items_by_fulfillment_order: [], // vuoto per evadere tutto
      },
    };

    const response = await client.post({
      path: `orders/${orderId}/fulfillments`,
      data: fulfillment,
      type: Shopify.DataType.JSON,
    });

    return new Response(
      JSON.stringify({ success: true, data: response.body }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Errore interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}