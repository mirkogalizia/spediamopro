// /app/api/facebook/spend/route.js
import { NextResponse } from 'next/server';

const FACEBOOK_AD_ACCOUNT_ID = 'act_907960570538812';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN;

export async function GET() {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // "2025-08-17"

  const url = `https://graph.facebook.com/v19.0/${FACEBOOK_AD_ACCOUNT_ID}/insights?fields=spend&time_range[since]=${dateString}&time_range[until]=${dateString}&access_token=${FACEBOOK_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(">> Facebook API raw data:", data); // <-- AGGIUNGI QUESTO

    const spendToday = data?.data?.[0]?.spend || "0";

    return NextResponse.json({
      ok: true,
      spendToday,
      raw: data, // <-- opzionale, utile per debug da frontend
    });

  } catch (error) {
    console.error("Errore API Facebook:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }
}