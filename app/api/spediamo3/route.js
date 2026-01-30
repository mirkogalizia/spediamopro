// /app/api/spediamo3/route.js
import { getSpediamoToken } from "../../lib/spediamo";
import { getShopify3Token } from "@/lib/shopify3-token"; // ← AGGIUNGI QUESTO

function getQueryParams(req) {
  const url = new URL(req.url, "http://localhost");
  return {
    step:            url.searchParams.get("step"),
    id:              url.searchParams.get("id"),
    shopifyOrderId:  url.searchParams.get("shopifyOrderId"),
  };
}

export async function POST(req) {
  const { step, id, shopifyOrderId } = getQueryParams(req);

  // Credenziali store 3 (Biscotti Sinceri)
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_3;
  const AUTHCODE = process.env.SPEDIAMO_AUTHCODE_3;

  // ════════════════════
  // STEP = "simula"
  // ════════════════════
  if (step === "simula") {
    try {
      const body = await req.json();
      const jwt  = await getSpediamoToken(AUTHCODE);

      const payload = {
        nazioneMittente:     "IT",
        nazioneDestinatario: body.nazioneDestinatario || "IT",
        capMittente:         "40141",
        capDestinatario:     body.capDestinatario,
        cittaMittente:       "Bologna",
        cittaDestinatario:   body.cittaDestinatario,
        provinciaMittente:   "BO",
        provinciaDestinatario: body.provinciaDestinatario,
        colli: [{
          altezza:    +body.altezza,
          larghezza:  +body.larghezza,
          profondita: +body.profondita,
          pesoReale:  +body.peso,
          packagingType: 0,
        }],
      };

      const res = await fetch("https://core.spediamopro.com/api/v1/simulazione", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw data;
      return new Response(JSON.stringify({ ok: true, simulazione: data.simulazione }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.error?.message || err.message || err }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ════════════════════
  // STEP = "create"
  // ════════════════════
  if (step === "create" && id && shopifyOrderId) {
    try {
      const body = await req.json().catch(() => ({}));
      const jwt  = await getSpediamoToken(AUTHCODE);
      const SHOPIFY_TOKEN = await getShopify3Token(); // ← USA TOKEN FRESCO ✅

      const shopRes = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2025-10/orders/${shopifyOrderId}.json`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_TOKEN, // ← ORA È FRESCO ✅
            "Content-Type":           "application/json",
          },
        }
      );
      if (!shopRes.ok) {
        const e = await shopRes.json();
        throw { source: "shopify", details: e };
      }
      const ship = (await shopRes.json()).order.shipping_address || {};

      const payload = {
        nazioneMittente:       "IT",
        nazioneDestinatario:   ship.country_code || ship.country,
        capMittente:           "40141",
        capDestinatario:       ship.zip,
        cittaMittente:         "Bologna",
        cittaDestinatario:     ship.city,
        provinciaMittente:     "BO",
        provinciaDestinatario: ship.province_code || ship.province,
        consigneePickupPointId: body.consigneePickupPointId || null,
        parcels: [{
          height:       20,
          length:       30,
          width:        5,
          realWeight:   1.0,
          packagingType: 0,
        }],
      };

      const createRes = await fetch(`https://core.spediamopro.com/api/v1/spedizione/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await createRes.json();
      if (!createRes.ok) throw data;
      return new Response(JSON.stringify({ ok: true, spedizione: data.spedizione }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      const status = err.source === "shopify" ? 502 : 500;
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ════════════════════
  // STEP = "update"
  // ════════════════════
  if (step === "update" && id) {
    try {
      const body = await req.json();
      const jwt  = await getSpediamoToken(AUTHCODE);

      const payload = {
        nominativoMittente:     "BISCOTTI SINCERI",
        senderAddressLine1:     "Via Example 123",
        senderAddressLine2:     body.indirizzo2 || null,
        comuneMittente:         "Bologna",
        provinciaMittente:      "BO",
        capMittente:            "40141",
        telefonoMittente:       "0511234567",
        emailMittente:          "info@biscottisinceri.it",
        nominativoDestinatario: body.nome,
        consigneeAddressLine1:  body.indirizzo,
        consigneePresso:  body.indirizzo2 || null,
        comuneDestinatario:     body.cittaDestinatario,
        provinciaDestinatario:  body.provinciaDestinatario,
        capDestinatario:        body.capDestinatario,
        telefonoDestinatario:   body.telefono,
        emailDestinatario:      body.email,
        noteDestinatario:       body.noteDestinatario || "",
        importoContrassegno:    body.importoContrassegno ?? 0,
        importoAssicurazione:   body.importoAssicurazione ?? 0,
        consigneePickupPointId: body.consigneePickupPointId || null,
        labelFormat:            body.labelFormat ?? 0,
        colli: [{
          altezza:    20,
          larghezza:  30,
          profondita: 5,
          pesoReale:  1.0,
          packagingType: 0,
        }],
        pickup: null,
      };

      const res = await fetch(`https://core.spediamopro.com/api/v1/spedizione/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return new Response(JSON.stringify({ ok: true, spedizione: data.spedizione }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ════════════════════
  // STEP = "pay"
  // ════════════════════
  if (step === "pay" && id) {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`https://core.spediamopro.com/api/v1/spedizione/${id}/can_pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type":  "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return new Response(JSON.stringify({ ok: true, can_pay: data.can_pay }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ════════════════════
  // STEP = "ldv"
  // ════════════════════
  if (step === "ldv" && id) {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`https://core.spediamopro.com/api/v1/spedizione/${id}/ldv`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type":  "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return new Response(JSON.stringify({ ok: true, ldv: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ════════════════════
  // STEP = "details"
  // ════════════════════
  if (step === "details" && id) {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`https://core.spediamopro.com/api/v1/spedizione/${id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type":  "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return new Response(JSON.stringify({ ok: true, spedizione: data.spedizione }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ════════════════════
  // Default response
  // ════════════════════
  return new Response(
    JSON.stringify({ ok: false, error: "step non supportato o id mancante" }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

