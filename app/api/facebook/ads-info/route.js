import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const adAccountId = 'act_907960570538812'; // <-- rimuovi <>
  const fields = 'amount_spent,spend_cap';

  try {
    // Spesa di oggi
    const today = new Date().toISOString().split("T")[0];
    const dailySpendUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=spend&time_range[since]=${today}&time_range[until]=${today}&access_token=${token}`;
    const res1 = await fetch(dailySpendUrl);
    const json1 = await res1.json();
    const spendToday = json1?.data?.[0]?.spend || "0";

    // Info account
    const accountUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=amount_spent,spend_cap&access_token=${token}`;
    const res2 = await fetch(accountUrl);
    const json2 = await res2.json();
    const amountSpent = json2.amount_spent || "0";
    const spendCap = json2.spend_cap || "0";
    const remaining = (parseFloat(spendCap) - parseFloat(amountSpent)).toString();

    return NextResponse.json({
      ok: true,
      spendToday,
      amountSpent,
      spendCap,
      remaining,
    });
  } catch (err) {
    console.error("Errore Facebook API:", err);
    return NextResponse.json({ ok: false, error: "Errore Facebook API" }, { status: 500 });
  }
}