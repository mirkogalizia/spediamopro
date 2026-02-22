// /lib/spediamo.js
const tokenCache = new Map();

/**
 * Ottieni token SpediamoPro
 *
 * v2: POST /api/v2/auth/token
 *     HTTP Basic Auth: username=authcode, password=""
 *     Body: grant_type=client_credentials (x-www-form-urlencoded)
 *     Risposta: { access_token, token_type, expires_in }
 *
 * Esempi:
 *   getSpediamoToken()                          → store 1 (SPEDIAMO_AUTHCODE)
 *   getSpediamoToken(process.env.SPEDIAMO_AUTHCODE_2) → store 2
 */
export async function getSpediamoToken(authcode) {
  const authToUse = authcode || process.env.SPEDIAMO_AUTHCODE;
  if (!authToUse) throw new Error("❌ Authcode SpediamoPro mancante");

  // Controlla cache
  const cached = tokenCache.get(authToUse);
  if (cached && cached.expiresAt > Date.now()) {
    console.log("✓ Token cached per authcode:", authToUse.substring(0, 10) + "...");
    return cached.access_token;
  }

  console.log("→ Login SpediamoPro v2 con authcode:", authToUse.substring(0, 10) + "...");

  // HTTP Basic: username = authcode, password = "" (stringa vuota)
  const basicAuth = Buffer.from(`${authToUse}:`).toString("base64");

  const res = await fetch("https://core.spediamopro.com/api/v2/auth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`❌ Login SpediamoPro v2 fallito (${res.status}): ${err.message || JSON.stringify(err)}`);
  }

  const data = await res.json();
  const { access_token, expires_in } = data;

  if (!access_token) {
    console.error("❌ Nessun access_token nella risposta:", data);
    throw new Error("Login SpediamoPro v2: access_token non trovato nella risposta");
  }

  // Salva in cache con margine di 60s prima della scadenza
  tokenCache.set(authToUse, {
    access_token,
    expiresAt: Date.now() + (expires_in || 3600) * 1000 - 60000,
  });

  console.log("✅ Token v2 ottenuto per authcode:", authToUse.substring(0, 10) + "...");
  return access_token;
}
