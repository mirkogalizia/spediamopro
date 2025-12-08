// app/api/kpi/store2/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00Z`;
    
    const shopifyDomain = process.env.SHOPIFY_DOMAIN_2;
    const shopifyToken = process.env.SHOPIFY_TOKEN_2;
    
    const headers = {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json'
    };

    // 1️⃣ TUTTI gli ordini UNFULFILLED (da sempre, tutti i canali)
    const unfulfilledRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=unfulfilled&limit=250`,
      { headers }
    );
    const unfulfilledData = await unfulfilledRes.json();
    const ordersUnfulfilled = unfulfilledData.orders || [];
    
    console.log(`[KPI] Ordini unfulfilled totali: ${ordersUnfulfilled.length}`);

    // 2️⃣ TUTTI gli ordini CREATI OGGI (per incasso del giorno)
    const todayOrdersRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${todayStart}&limit=250`,
      { headers }
    );
    const todayOrdersData = await todayOrdersRes.json();
    const todayOrders = todayOrdersData.orders || [];
    
    console.log(`[KPI] Ordini creati oggi: ${todayOrders.length}`);

    // 3️⃣ INCASSO DI OGGI (somma di tutti gli ordini creati oggi)
    const revenueToday = todayOrders.reduce((sum, order) => {
      return sum + parseFloat(order.total_price || 0);
    }, 0);
    
    console.log(`[KPI] Incasso oggi: €${revenueToday.toFixed(2)}`);

    // 4️⃣ Ordini EVASI OGGI (con fulfillment creato oggi)
    const fulfilledTodayRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=fulfilled&updated_at_min=${todayStart}&limit=250`,
      { headers }
    );
    const fulfilledTodayData = await fulfilledTodayRes.json();
    const allFulfilledOrders = fulfilledTodayData.orders || [];
    
    // Filtra solo quelli con fulfillment creato OGGI
    const ordersFulfilledToday = allFulfilledOrders.filter(order => {
      if (!order.fulfillments || order.fulfillments.length === 0) return false;
      
      return order.fulfillments.some(fulfillment => {
        const fulfillmentDate = new Date(fulfillment.created_at).toISOString().split('T')[0];
        return fulfillmentDate === today;
      });
    });
    
    console.log(`[KPI] Ordini evasi oggi: ${ordersFulfilledToday.length}`);

    return NextResponse.json({
      success: true,
      date: today,
      
      // 1. Totale ordini da evadere (da sempre)
      ordersUnfulfilled: ordersUnfulfilled.length,
      
      // 2. Incasso totale di oggi (tutti gli ordini creati oggi)
      revenueToday: revenueToday.toFixed(2),
      
      // 3. Ordini evasi oggi
      ordersFulfilledToday: ordersFulfilledToday.length,
      
      currency: todayOrders[0]?.currency || 'EUR'
    });
    
  } catch (error) {
    console.error('[KPI] Errore:', error);
    return NextResponse.json(
      { 
        success: false,
        ordersUnfulfilled: 0,
        revenueToday: '0.00',
        ordersFulfilledToday: 0,
        error: error.message
      },
      { status: 500 }
    );
  }
}
