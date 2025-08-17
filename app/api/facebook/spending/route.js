import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const adAccountId = "act_907960570538812";

  const today = new Date().toISOString().split("T")[0];
  const timeRangeToday = `time_range[since]=${today}&time_range[until]=${today}`;
  const todayUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=spend&${timeRangeToday}&access_token=${token}`;

  const allUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=amount_spent,spend_cap,balance&access_token=${token}`;

  try {
    const [resToday, resAll] = await Promise.all([fetch(todayUrl), fetch(allUrl)]);
    const dataToday = await resToday.json();
    const dataAll = await resAll.json();

    console.log("URL Today:", todayUrl);
    console.log("Response Today:", JSON.stringify(dataToday, null, 2));
    console.log("URL Account:", allUrl);
    console.log("Response Account:", JSON.stringify(dataAll, null, 2));

    const spendToday = dataToday.data?.[0]?.spend ?? "0";
    const amountSpent = dataAll.amount_spent ?? "0";
    const spendCap = dataAll.spend_cap ?? "0";

    const remaining = (parseFloat(spendCap) - parseFloat(amountSpent)).toString();

    return NextResponse.json({
      ok: true,
      spendToday,
      amountSpent,
      spendCap,
      remaining,
      rawToday: dataToday,
      rawAccount: dataAll,
    });
  } catch (error) {
    console.error("Errore in Facebook Ads info route:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}