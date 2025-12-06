// app/api/kpi/store2/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const shopifyDomain = process.env.SHOPIFY_DOMAIN_2; // Store 2
    const shopifyToken = process.env.SHOPIFY_TOKEN_2;
    
    // 1. Ordini fulfillment oggi (store 2)
    const ordersRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=fulfilled&created_at_min=${today}T00:00:00Z`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!ordersRes.ok) {
      throw new Error('Errore caricamento ordini Shopify');
    }
    
    const ordersData = await ordersRes.json();
    const ordersFulfilled = ordersData.orders || [];
    
    // 2. Calcola incasso oggi
    const revenueToday = ordersFulfilled.reduce((sum, order) => {
      return sum + parseFloat(order.total_price || 0);
    }, 0);
    
    return NextResponse.json({
      ordersFulfilledToday: ordersFulfilled.length,
      revenueToday: revenueToday.toFixed(2),
      currency: ordersFulfilled[0]?.currency || 'EUR'
    });
    
  } catch (error) {
    console.error('Errore KPI:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
