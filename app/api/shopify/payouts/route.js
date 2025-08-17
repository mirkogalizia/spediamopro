// app/api/shopify/payouts/route.js
import { NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export async function GET() {
  try {
    // 1. Recupera tutti i payout
    const payoutRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-07/shopify_payments/payouts.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!payoutRes.ok) throw new Error("Errore nel recupero dei payout");
    const payoutData = await payoutRes.json();
    const payouts = payoutData.payouts;

    // 2. Calcola data range: da 1° del mese a oggi
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const from = `${yyyy}-${mm}-01`;
    const to = `${yyyy}-${mm}-${dd}`;

    // 3. Recupera ordini dal 1° del mese a oggi
    const orders = [];
    let url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07/orders.json?status=any&limit=250&created_at_min=${from}T00:00:00Z&created_at_max=${to}T23:59:59Z&fields=created_at,total_price`;

    while (url) {
      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error("Errore nel recupero ordini");

      const data = await res.json();
      orders.push(...data.orders);

      const linkHeader = res.headers.get('link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        url = match ? match[1] : null;
      } else {
        url = null;
      }
    }

    // 4. Raggruppa incassi per giorno
    const incassiByDay = {};
    for (const order of orders) {
      const date = formatDate(new Date(order.created_at));
      incassiByDay[date] = (incassiByDay[date] || 0) + parseFloat(order.total_price);
    }

    // 5. Combina payout e incasso per giorno
    const combined = {};

    payouts.forEach(p => {
      const d = formatDate(new Date(p.date));
      if (!combined[d]) combined[d] = { date: d, payout: 0, incasso: 0 };
      combined[d].payout = parseFloat(p.amount);
    });

    Object.entries(incassiByDay).forEach(([d, val]) => {
      if (!combined[d]) combined[d] = { date: d, payout: 0, incasso: 0 };
      combined[d].incasso = val;
    });

    // 6. Ordina per data crescente
    const result = Object.values(combined).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ ok: true, cashflow: result });
  } catch (err) {
    console.error("Errore API payout/incasso:", err);
    return NextResponse.json({ ok: false, error: err.message || "Errore generico" }, { status: 500 });
  }
}