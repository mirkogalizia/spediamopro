import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN;
  const adAccountId = 'act_907960570538812'; // <- Sostituisci con il tuo ID account pubblicitario

  const fields = 'spend,account_id,balance,amount_due';
  const today = new Date().toISOString().split("T")[0];
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=spend&time_range[since]=${today}&time_range[until]=${today}&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Qui puoi fare una seconda chiamata per vedere anche il saldo attuale (opzionale)

    return NextResponse.json({ spendToday: data?.data?.[0]?.spend || "0" });
  } catch (e) {
    console.error("Errore Facebook API:", e);
    return NextResponse.json({ error: "Errore durante fetch da Facebook" }, { status: 500 });
  }
}