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
    
    if (!shopifyDomain || !shopifyToken) {
      throw new Error('Variabili Shopify non configurate');
    }
    
    const headers = {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json'
    };

    console.log(`[KPI] Fetching data for date: ${today}`);

    // 1️⃣ Ordini UNFULFILLED totali (tutti, non solo oggi)
    const unfulfilledRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=unfulfilled&limit=250`,
      { headers }
    );
    
    if (!unfulfilledRes.ok) {
      throw new Error(`Shopify API error: ${unfulfilledRes.status}`);
    }
    
    const unfulfilledData = await unfulfilledRes.json();
    const ordersUnfulfilled = unfulfilledData.orders || [];
    
    console.log(`[KPI] Ordini unfulfilled totali: ${ordersUnfulfilled.length}`);

    // 2️⃣ Ordini FULFILLED oggi (evasioni di oggi)
    // ATTENZIONE: fulfillments hanno una data diversa dalla creazione ordine!
    const fulfilledTodayRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=fulfilled&updated_at_min=${todayStart}&limit=250`,
      { headers }
    );
    
    if (!fulfilledTodayRes.ok) {
      throw new Error(`Shopify API error: ${fulfilledTodayRes.status}`);
    }
    
    const fulfilledTodayData = await fulfilledTodayRes.json();
    const allFulfilledOrders = fulfilledTodayData.orders || [];
    
    // Filtra solo gli ordini EVASI oggi (non creati oggi)
    const ordersFulfilledToday = allFulfilledOrders.filter(order => {
      if (!order.fulfillments || order.fulfillments.length === 0) return false;
      
      // Verifica se almeno un fulfillment è di oggi
      return order.fulfillments.some(fulfillment => {
        const fulfillmentDate = new Date(fulfillment.created_at).toISOString().split('T')[0];
        return fulfillmentDate === today;
      });
    });
    
    console.log(`[KPI] Ordini evasi oggi: ${ordersFulfilledToday.length}`);

    // 3️⃣ INCASSO DI OGGI (somma ordini evasi oggi)
    const revenueToday = ordersFulfilledToday.reduce((sum, order) => {
      return sum + parseFloat(order.total_price || 0);
    }, 0);
    
    console.log(`[KPI] Incasso oggi: €${revenueToday.toFixed(2)}`);

    // 4️⃣ Ordini TOTALI creati oggi (opzionale, per statistica)
    const allTodayRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${todayStart}&limit=250`,
      { headers }
    );
    const allTodayData = await allTodayRes.json();
    const ordersTotalToday = allTodayData.orders?.length || 0;

    return NextResponse.json({
      success: true,
      date: today,
      
      // Totale ordini da evadere (tutti quelli unfulfilled)
      ordersUnfulfilled: ordersUnfulfilled.length,
      
      // Ordini evasi OGGI
      ordersFulfilledToday: ordersFulfilledToday.length,
      
      // Incasso di OGGI (solo ordini evasi oggi)
      revenueToday: revenueToday.toFixed(2),
      
      // Ordini totali creati oggi (bonus)
      ordersTotalToday: ordersTotalToday,
      
      currency: ordersFulfilledToday[0]?.currency || allFulfilledOrders[0]?.currency || 'EUR',
      
      // Debug info
      _debug: {
        timestamp: now.toISOString(),
        todayStart: todayStart
      }
    });
    
  } catch (error) {
    console.error('[KPI] Errore:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        ordersUnfulfilled: 0,
        ordersFulfilledToday: 0,
        revenueToday: '0.00'
      },
      { status: 500 }
    );
  }
}
