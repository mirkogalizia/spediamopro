import { NextResponse } from 'next/server';

const FACEBOOK_AD_ACCOUNT_ID = 'act_907960570538812';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN;

export async function GET() {
  const today = new Date();
  const date = today.toISOString().split('T')[0]; // formato YYYY-MM-DD

  const url = `https://graph.facebook.com/v19.0/${FACEBOOK_AD_ACCOUNT_ID}/insights?fields=spend&time_range[since]=${date}&time_range[until]=${date}&access_token=${FACEBOOK_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const spendToday = data?.data?.[0]?.spend || '0';

    return NextResponse.json({ ok: true, spendToday });
  } catch (error) {
    console.error('Errore fetch Facebook spend:', error);
    return NextResponse.json({ ok: false, error: 'Errore nel recupero spesa Facebook' });
  }
}