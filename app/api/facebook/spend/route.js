import { NextResponse } from 'next/server';

const FACEBOOK_AD_ACCOUNT_ID = 'act_907960570538812';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN;

function getFirstDayOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const startDate = getFirstDayOfMonth();
  const endDate = getToday();

  try {
    const txUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_AD_ACCOUNT_ID}/transactions?fields=payment_method_details,amount,created_time&limit=100&access_token=${FACEBOOK_ACCESS_TOKEN}`;
    const txRes = await fetch(txUrl);
    const txData = await txRes.json();

    const paymentsThisMonth = (txData?.data || []).filter(t => {
      const date = new Date(t.created_time);
      return date >= new Date(startDate) && date <= new Date(endDate);
    }).map(t => ({
      amount: t.amount,
      date: t.created_time,
      method: t.payment_method_details?.type || 'unknown'
    }));

    return NextResponse.json({
      ok: true,
      paymentsThisMonth
    });

  } catch (err) {
    console.error('[FACEBOOK ERROR]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}