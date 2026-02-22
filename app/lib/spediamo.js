// /lib/spediamo.js
const tokenCache = new Map();

export async function getSpediamoToken(authcode) {
  const authToUse = authcode || process.env.SPEDIAMO_AUTHCODE;
  if (!authToUse) throw new Error("❌ Authcode SpediamoPro mancante");

  const cached = tokenCache.get(authToUse);
  if (cached && cached.expiresAt > Date.now()) {
    console.log("✓ Token cached per authcode:", authToUse.substring(0, 10) + "...");
    return cached.jwt;
  }

  console.log("→ Login SpediamoPro con authcode:", authToUse.substring(0, 10) + "...");

  // ✅ L'unico endpoint di login è sempre v1 — vale anche per chiamate v2
  const res = await fetch("https://core.spediamopro.com/api/v1/auth/login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ authCode: authToUse }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`❌ Login SpediamoPro fallito: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  const jwt  = data.token || data.data?.token;

  if (!jwt) {
    console.error("❌ Errore autenticazione SpediamoPro:", data);
    throw new Error("Login SpediamoPro: token non trovato nella risposta");
  }

  tokenCache.set(authToUse, {
    jwt,
    expiresAt: Date.now() + (3600 * 1000) - 60000, // 59 minuti
  });

  console.log("✅ Token ottenuto per authcode:", authToUse.substring(0, 10) + "...");
  return jwt;
}
