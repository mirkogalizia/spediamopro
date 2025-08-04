import Shopify from '@shopify/shopify-api';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId, trackingNumber, carrierName } = req.body;

  if (!orderId || !trackingNumber || !carrierName) {
    return res.status(400).json({ error: 'Missing required fields: orderId, trackingNumber, carrierName' });
  }

  try {
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
        line_items: [], // Vuoto significa evadi tutti gli articoli
      },
    };

    const response = await client.post({
      path: `orders/${orderId}/fulfillments`,
      data: fulfillmentPayload,
      type: Shopify.DataType.JSON,
    });

    return res.status(200).json({ success: true, data: response.body });
  } catch (error) {
    console.error('Shopify Fulfillment error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}