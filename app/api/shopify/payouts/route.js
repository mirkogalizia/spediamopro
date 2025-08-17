// app/api/shopify/payouts/route.js
import { NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export async function GET() {
  try {
    // --- 1. Recupera i Payout
    const payoutsRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-07/shopify_payments/payouts.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!payoutsRes.ok) throw new Error("Errore nel recupero dei payout");

    const { payouts } = await payoutsRes.json();

    // --- 2. Recupera gli ordini PAGATI ultimi 30 giorni
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);

    const from = formatDate(start);
    const to = formatDate(today);

    const ordersRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-07/orders.json?created_at_min=${from}T00:00:00-02:00&created_at_max=${to}T23:59:59-02:00&financial_status=paid&status=any&limit=250`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersRes.ok) throw new Error("Errore nel recupero degli ordini");

    const { orders } = await ordersRes.json();

    // --- 3. Aggrega incassi per giorno
    const incassi = {};
    orders.forEach(order => {
      const giorno = order.created_at.split('T')[0];
      const incasso = parseFloat(order.total_price);
      incassi[giorno] = (incassi[giorno] || 0) + incasso;
    });

    return NextResponse.json({ ok: true, payouts, incassi_per_giorno: incassi });
  } catch (err) {
    console.error("Errore API Shopify:", err);
    return NextResponse.json({ ok: false, error: err.message || "Errore generico" }, { status: 500 });
  }
}