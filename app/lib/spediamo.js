// /app/lib/spediamo.js

// Cache token per authcode (un token per ogni authcode)
const tokenCache = new Map();

/**
 * Login SpediamoPro con authcode
 * 
 * IMPORTANTE:
 * - Se NON passi authcode → usa SPEDIAMO_AUTHCODE (store VECCHIO/ATTUALE)
 * - Se passi authcode → usa quello (store NUOVO come Biscotti Sinceri)
 * 
 * Esempi:
 * - getSpediamoToken() → usa authcode ATTUALE (store vecchio)
 * - getSpediamoToken(process.env.SPEDIAMO_AUTHCODE_3) → usa authcode NUOVO (store 3)
 */
export async function getSpediamoToken(authcode) {
  // ========================================
  // Se non passi niente, usa l'authcode ATTUALE (store vecchio)
  // ========================================
  const authToUse = authcode || process.env.SPEDIAMO_AUTHCODE;
  
  if (!authToUse) {
    throw new Error("❌ Authcode SpediamoPro mancante");
  }

  // ========================================
  // Controlla se abbiamo già un token valido in cache
  // ========================================
  const cached = tokenCache.get(authToUse);
  if (cached && cached.expiresAt > Date.now()) {
    console.log("✓ Token cached per authcode:", authToUse.substring(0, 10) + "...");
    return cached.jwt;
  }

  // ========================================
  // Token scaduto o mancante → fai login
  // ========================================
  console.log("→ Login SpediamoPro con authcode:", authToUse.substring(0, 10) + "...");

  const res = await fetch("https://core.spediamopro.com/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authCode: authToUse  // ← usa l'authcode giusto (vecchio o nuovo)
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`❌ Login SpediamoPro fallito: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  
  if (!data.token) {
    console.error("❌ Errore autenticazione SpediamoPro:", data);
    throw new Error("Login SpediamoPro errore dati");
  }

  // ========================================
  // Salva token in cache (1 ora - 1 minuto di safety)
  // ========================================
  tokenCache.set(authToUse, {
    jwt: data.token,
    expiresAt: Date.now() + (3600 * 1000) - 60000,  // 59 minuti
  });

  console.log("✅ Token ottenuto e salvato in cache per authcode:", authToUse.substring(0, 10) + "...");
  return data.token;
}
