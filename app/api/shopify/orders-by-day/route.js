// /app/api/shopify/orders-by-day/route.js
import { NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

const TSHIRT_COST = 2.26;
const FELPA_COST = 7.66;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ ok: false, error: 'Missing date range' }, { status: 400 });
  }

  const ordersRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/orders.json?status=paid&created_at_min=${from}T00:00:00Z&created_at_max=${to}T23:59:59Z&limit=250`, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  const ordersData = await ordersRes.json();
  const orders = ordersData.orders || [];

  const byDay = {};

  for (const order of orders) {
    const date = formatDate(new Date(order.created_at));
    if (!byDay[date]) {
      byDay[date] = {
        date,
        incasso: 0,
        spedizione: 0,
        tshirt: 0,
        felpe: 0
      };
    }

    byDay[date].incasso += parseFloat(order.total_price);
    byDay[date].spedizione += parseFloat(order.total_shipping_price_set.shop_money.amount);

    for (const item of order.line_items) {
      const title = item.title.toLowerCase();
      const qty = item.quantity;
      if (title.includes('tshirt') || title.includes('t-shirt')) {
        byDay[date].tshirt += qty;
      } else if (title.includes('felpa')) {
        byDay[date].felpe += qty;
      }
    }
  }

  const days = Object.values(byDay).map(day => {
    const costo_merce = (day.tshirt * TSHIRT_COST) + (day.felpe * FELPA_COST);
    const margine_netto = day.incasso - day.spedizione - costo_merce;
    return { ...day, costo_merce, margine_netto };
  });

  return NextResponse.json({ ok: true, days });
}
