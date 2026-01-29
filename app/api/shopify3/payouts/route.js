// /app/api/shopify3/payouts/route.js
import { NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_3;

// ========================================
// Helper: ottieni token sempre valido (OAuth refresh automatico)
// ========================================
async function getShopifyToken() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/shopify3/auth`);
  const data = await res.json();

  if (!data.success) {
    throw new Error("Impossibile ottenere token Shopify: " + data.error);
  }

  return data.access_token;
}

export async function GET() {
  try {
    const SHOPIFY_TOKEN = await getShopifyToken(); // ← Token OAuth fresco

    console.log("→ Recupero payouts Shopify...");

    // 1. Recupera tutti i payout
    const payoutRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2025-10/shopify_payments/payouts.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!payoutRes.ok) throw new Error("Errore nel recupero dei payout");
    const payoutData = await payoutRes.json();
    const payouts = payoutData.payouts;

    console.log(`✅ Trovati ${payouts.length} payouts`);

    // 2. Calcola gli incassi giornalieri veri per ogni giorno in cui esiste un payout
    const incassi = {};

    for (const p of payouts) {
      const date = p.date.split('T')[0]; // solo YYYY-MM-DD
      if (incassi[date]) continue; // già calcolato quel giorno

      const ordersRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2025-10/orders.json?created_at_min=${date}T00:00:00-02:00&created_at_max=${date}T23:59:59-02:00&financial_status=paid&status=any&limit=250`, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!ordersRes.ok) {
        incassi[date] = 0;
        continue;
      }

      const ordersData = await ordersRes.json();
      const totale = ordersData.orders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
      incassi[date] = totale;
    }

    // 3. Arricchisci i payout con l'incasso del giorno
    const arricchiti = payouts.map(p => {
      const date = p.date.split('T')[0];
      return {
        ...p,
        incasso: incassi[date] || 0
      };
    });

    console.log("✅ Payouts arricchiti con incassi giornalieri");

    return NextResponse.json({ ok: true, payouts: arricchiti });

  } catch (err) {
    console.error("❌ Errore API payout:", err);
    return NextResponse.json({ ok: false, error: err.message || "Errore generico" }, { status: 500 });
  }
}
