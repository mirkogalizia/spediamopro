// /app/lib/spediamo.js
export async function getSpediamoToken() {
  const res = await fetch("https://core.spediamopro.com/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authCode: process.env.SPEDIAMO_AUTHCODE
    }),
  });

  const data = await res.json();
  if (!data.token) {
    console.error("Errore autenticazione SpediamoPro:", data);
    throw new Error("Login SpediamoPro errore dati");
  }
  return data.token;
}
