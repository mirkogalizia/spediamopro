import Shopify from '@shopify/shopify-api';

export async function POST(req) {
  try {
    const { orderId, trackingNumber, carrierName } = await req.json();

    if (!orderId || !trackingNumber || !carrierName) {
      return new Response(
        JSON.stringify({ error: "orderId, trackingNumber e carrierName sono obbligatori" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new Shopify.Clients.Rest(
      process.env.SHOPIFY_DOMAIN,
      process.env.SHOPIFY_TOKEN
    );

    const fulfillmentPayload = {
      fulfillment: {
        location_id: parseInt(process.env.SHOPIFY_LOCATION_ID, 10),
        tracking_number: trackingNumber,
        tracking_company: carrierName,
        notify_customer: true,
      },
    };

    const response = await client.post({
      path: `orders/${orderId}/fulfillments.json`,
      data: fulfillmentPayload,
      type: Shopify.DataType.JSON,
    });

    console.log("Shopify fulfillment response:", JSON.stringify(response.body, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Fulfillment creato con successo",
        data: response.body,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Errore fulfillment:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Errore interno durante la creazione del fulfillment",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}