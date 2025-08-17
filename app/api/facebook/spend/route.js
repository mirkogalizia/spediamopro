import { NextResponse } from 'next/server';

const FACEBOOK_AD_ACCOUNT_ID = 'act_907960570538812';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN!;

export async function GET() {
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0]; // "2025-08-17"

  const url = `https://graph.facebook.com/v19.0/${FACEBOOK_AD_ACCOUNT_ID}/insights?fields=spend&time_range[since]=${formattedDate}&time_range[until]=${formattedDate}&access_token=${FACEBOOK_ACCESS_TOKEN}`;

  try {
    const response = await fetch(encodeURI(url));
    const data = await response.json();

    if (data?.data?.[0]?.spend) {
      return NextResponse.json({ ok: true, spendToday: data.data[0].spend });
    } else {
      console.error('No spend data found:', data);
      return NextResponse.json({ ok: false, spendToday: '0' });
    }
  } catch (error) {
    console.error('Errore chiamata Facebook:', error);
    return NextResponse.json({ ok: false, spendToday: '0' });
  }
}