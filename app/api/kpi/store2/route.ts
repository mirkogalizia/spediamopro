// app/api/kpi/store2/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Funzione per fetch con paginazione
async function fetchAllUnfulfilledOrders(shopifyDomain: string, shopifyToken: string) {
  const headers = {
    'X-Shopify-Access-Token': shopifyToken,
    'Content-Type': 'application/json'
  };
  
  let allOrders: any[] = [];
  let url = `https://${shopifyDomain}/admin/api/2024-01/orders.json?fulfillment_status=unfulfilled&limit=250`;
  
  while (url) {
    const res = await fetch(url, { headers });
    const data = await res.json();
    
    allOrders = [...allOrders, ...(data.orders || [])];
    
    console.log(`[KPI] Fetched ${data.orders?.length || 0} orders, total so far: ${allOrders.length}`);
    
    const linkHeader = res.headers.get('Link');
    url = null;
    
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
  }
  
  console.log(`[KPI] Total unfulfilled orders: ${allOrders.length}`);
  return allOrders;
}

// ✅ NUOVA: Funzione per calcolare ordini evasi in un giorno specifico
async function getFulfilledOrdersForDay(
  shopifyDomain: string, 
  shopifyToken: string, 
  targetDate: string
) {
  const headers = {
    'X-Shopify-Access-Token': shopifyToken,
    'Content-Type': 'application/json'
  };

  const dayStart = `${targetDate}T00:00:00Z`;
  const dayEnd = `${targetDate}T23:59:59Z`;

  const res = await fetch(
    `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=fulfilled&updated_at_min=${dayStart}&updated_at_max=${dayEnd}&limit=250`,
    { headers }
  );
  
  const data = await res.json();
  const allOrders = data.orders || [];
  
  // Filtra ordini effettivamente evasi nel giorno target
  const fulfilledInDay = allOrders.filter(order => {
    if (!order.fulfillments || order.fulfillments.length === 0) return false;
    return order.fulfillments.some(fulfillment => {
      const fulfillmentDate = new Date(fulfillment.created_at).toISOString().split('T')[0];
      return fulfillmentDate === targetDate;
    });
  });

  return fulfilledInDay.length;
}

export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00Z`;
    
    const shopifyDomain = process.env.SHOPIFY_DOMAIN_2;
    const shopifyToken = process.env.SHOPIFY_TOKEN_2;
    
    if (!shopifyDomain || !shopifyToken) {
      throw new Error('Shopify credentials missing');
    }
    
    const headers = {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json'
    };

    // 1️⃣ TUTTI gli ordini UNFULFILLED
    const ordersUnfulfilled = await fetchAllUnfulfilledOrders(shopifyDomain, shopifyToken);

    // 2️⃣ Ordini CREATI OGGI (per incasso)
    const todayOrdersRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${todayStart}&limit=250`,
      { headers }
    );
    const todayOrdersData = await todayOrdersRes.json();
    const todayOrders = todayOrdersData.orders || [];

    // 3️⃣ INCASSO DI OGGI
    const revenueToday = todayOrders.reduce((sum, order) => {
      return sum + parseFloat(order.total_price || 0);
    }, 0);

    // 4️⃣ Ordini EVASI OGGI
    const fulfilledTodayRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&fulfillment_status=fulfilled&updated_at_min=${todayStart}&limit=250`,
      { headers }
    );
    const fulfilledTodayData = await fulfilledTodayRes.json();
    const allFulfilledOrders = fulfilledTodayData.orders || [];
    
    const ordersFulfilledToday = allFulfilledOrders.filter(order => {
      if (!order.fulfillments || order.fulfillments.length === 0) return false;
      return order.fulfillments.some(fulfillment => {
        const fulfillmentDate = new Date(fulfillment.created_at).toISOString().split('T')[0];
        return fulfillmentDate === today;
      });
    }).length;

    // ✅ 5️⃣ CALCOLO TREND (ultimi 6 giorni)
    const last6DaysFulfilled: number[] = [];
    
    for (let i = 1; i <= 6; i++) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - i);
      const dateString = dayDate.toISOString().split('T')[0];
      
      const dayFulfilled = await getFulfilledOrdersForDay(
        shopifyDomain,
        shopifyToken,
        dateString
      );
      
      last6DaysFulfilled.push(dayFulfilled);
    }

    const avgPrevious = last6DaysFulfilled.length > 0
      ? last6DaysFulfilled.reduce((a, b) => a + b, 0) / last6DaysFulfilled.length
      : 0;

    const trendChange = avgPrevious > 0
      ? ((ordersFulfilledToday - avgPrevious) / avgPrevious) * 100
      : ordersFulfilledToday > 0 ? 100 : 0;

    const trendDirection = ordersFulfilledToday >= avgPrevious ? 'up' : 'down';

    console.log(`[KPI] Final stats - Unfulfilled: ${ordersUnfulfilled.length}, Revenue: €${revenueToday.toFixed(2)}, Fulfilled today: ${ordersFulfilledToday}`);
    console.log(`[KPI] Trend - Change: ${trendChange.toFixed(1)}%, Direction: ${trendDirection}, Avg: ${avgPrevious.toFixed(1)}`);

    return NextResponse.json({
      success: true,
      ordersUnfulfilled: ordersUnfulfilled.length,
      revenueToday: parseFloat(revenueToday.toFixed(2)),
      ordersFulfilledToday: ordersFulfilledToday,
      currency: todayOrders[0]?.currency || 'EUR',
      trend: {
        change: parseFloat(trendChange.toFixed(1)),
        direction: trendDirection,
        average: parseFloat(avgPrevious.toFixed(1))
      }
    });
    
  } catch (error: any) {
    console.error('[KPI] Errore:', error);
    return NextResponse.json(
      { 
        success: false,
        ordersUnfulfilled: 0,
        revenueToday: 0,
        ordersFulfilledToday: 0,
        error: error.message,
        trend: {
          change: 0,
          direction: 'up',
          average: 0
        }
      },
      { status: 500 }
    );
  }
}
