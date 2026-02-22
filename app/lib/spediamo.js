// /lib/spediamo.js
// Cache separata per v1 e v2
const tokenCache = new Map();

/**
 * Login SpediamoPro
 *
 * IMPORTANTE:
 * - getSpediamoToken()          → v2, authcode STORE 1 (SPEDIAMO_AUTHCODE)
 * - getSpediamoToken(code, "v1") → v1, per chiamate legacy ancora su v1
 * - getSpediamoToken(process.env.SPEDIAMO_AUTHCODE_2) → v2, store 2
 * - getSpediamoToken(process.env.SPEDIAMO_AUTHCODE_3) → v2, store 3
 */
export async function getSpediamoToken(authcode, version = "v2") {
  const authToUse = authcode || process.env.SPEDIAMO_AUTHCODE;

  if (!authToUse) {
    throw new Error("❌ Authcode SpediamoPro mancante");
  }

  // Chiave cache distinta per authcode + versione API
  const cacheKey = `${version}::${authToUse}`;

  // Controlla cache
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`✓ Token cached (${version}) per authcode:`, authToUse.substring(0, 10) + "...");
    return cached.jwt;
  }

  // Login — endpoint diverso per v1 e v2
  const loginUrl = version === "v2"
    ? "https://core.spediamopro.com/api/v2/auth/login"
    : "https://core.spediamopro.com/api/v1/auth/login";

  console.log(`→ Login SpediamoPro (${version}) con authcode:`, authToUse.substring(0, 10) + "...");

  const res = await fetch(loginUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ authCode: authToUse }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`❌ Login SpediamoPro (${version}) fallito: ${err.message || res.statusText}`);
  }

  const data = await res.json();

  // v2 può restituire il token in data.token oppure data.data.token
  const jwt = data.token || data.data?.token;
  if (!jwt) {
    console.error(`❌ Errore autenticazione SpediamoPro (${version}):`, data);
    throw new Error(`Login SpediamoPro (${version}) errore dati`);
  }

  // Salva in cache 59 minuti
  tokenCache.set(cacheKey, {
    jwt,
    expiresAt: Date.now() + (3600 * 1000) - 60000,
  });

  console.log(`✅ Token (${version}) ottenuto e salvato per authcode:`, authToUse.substring(0, 10) + "...");
  return jwt;
}
