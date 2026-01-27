// app/api/shopify/payouts/route.js
import { NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-07/shopify_payments/payouts.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error("Errore nel recupero dei payout");

    const data = await res.json();

    return NextResponse.json({ ok: true, payouts: data.payouts });
  } catch (err) {
    console.error("Errore API payout:", err);
    return NextResponse.json({ ok: false, error: err.message || "Errore generico" }, { status: 500 });
  }
}