// /app/api/shopify/fulfill-order/route.js

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("INIZIO FULFILL-ORDER - ARRIVATA RICHIESTA", req.method, body);

    // DEBUG: restituisci direttamente l'echo del body
    return new Response(
      JSON.stringify({ success: true, echo: body }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}