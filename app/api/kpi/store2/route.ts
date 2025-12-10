// app/api/kpi/store2/route.ts (AGGIORNA ESISTENTE)
import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function getOrdersInRange(startDate: string, endDate: string) {
  const url = `https://${SHOPIFY_SHOP}/admin/api/2024-01/orders.json?status=any&created_at_min=${startDate}&created_at_max=${endDate}&limit=250`;
  
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Shopify API error: ${response.status}`);
  const data = await response.json();
  return data.orders || [];
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date().toISOString();

    // Ultimi 7 giorni per calcolare la media
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const orders = await getOrdersInRange(weekAgo.toISOString(), todayEnd);

    // Ordini di oggi
    const todayOrders = orders.filter(order => {
      const createdAt = new Date(order.created_at);
      return createdAt >= new Date(todayStart);
    });

    const ordersFulfilledToday = todayOrders.filter(
      order => order.fulfillment_status === 'fulfilled'
    ).length;

    const revenueToday = todayOrders
      .filter(order => 
        order.fulfillment_status === 'fulfilled' && 
        order.financial_status === 'paid'
      )
      .reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0);

    // Calcola media ultimi 6 giorni (escluso oggi)
    const last6Days: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter(order => {
        const createdAt = new Date(order.created_at);
        return createdAt >= dayStart && createdAt <= dayEnd;
      });

      const dayFulfilled = dayOrders.filter(
        order => order.fulfillment_status === 'fulfilled'
      ).length;

      last6Days.push(dayFulfilled);
    }

    const avgPrevious = last6Days.reduce((a, b) => a + b, 0) / last6Days.length;

    // Calcola trend
    const trendChange = avgPrevious > 0
      ? ((ordersFulfilledToday - avgPrevious) / avgPrevious) * 100
      : ordersFulfilledToday > 0 ? 100 : 0;

    const trendDirection = ordersFulfilledToday >= avgPrevious ? 'up' : 'down';

    // Ordini totali inevasi
    const allOrders = await getOrdersInRange(
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      todayEnd
    );
    
    const ordersUnfulfilled = allOrders.filter(
      order => order.fulfillment_status !== 'fulfilled'
    ).length;

    return NextResponse.json({
      ordersFulfilledToday,
      revenueToday: parseFloat(revenueToday.toFixed(2)),
      ordersUnfulfilled,
      trend: {
        change: parseFloat(trendChange.toFixed(1)),
        direction: trendDirection,
        average: parseFloat(avgPrevious.toFixed(1))
      }
    });

  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: error.message || 'Errore caricamento KPI' },
      { status: 500 }
    );
  }
}
