// /app/api/spediamo3/route.js
import { getSpediamoToken } from "../../lib/spediamo";

const API = "https://core.spediamopro.com/api/v2";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getQueryParams(req) {
  const url = new URL(req.url, "http://localhost");
  return {
    step: url.searchParams.get("step"),
    id:   url.searchParams.get("id"),
  };
}

export async function POST(req) {
  const { step, id } = getQueryParams(req);
  // ⚠️ authcode separato — profilo SpediamoPro di Biscotti Sinceri
  const AUTHCODE = process.env.SPEDIAMO_AUTHCODE_3;

  // ════════════════════════════════════════
  // STEP = "quotations"
  // ════════════════════════════════════════
  if (step === "quotations") {
    try {
      const body = await req.json();
      const jwt  = await getSpediamoToken(AUTHCODE);
      const payload = {
        sender: {
          name:       body.mittente.name,
          address:    body.mittente.address,
          postalCode: body.mittente.postalCode,
          city:       body.mittente.city,
          province:   body.mittente.province,
          country:    body.mittente.country,
          phone:      body.mittente.phone,
          email:      body.mittente.email,
        },
        consignee: {
          name:       body.nomeDestinatario,
          address:    body.indirizzoDestinatario,
          postalCode: body.capDestinatario,
          city:       body.cittaDestinatario,
          province:   body.provinciaDestinatario,
          country:    body.nazioneDestinatario || "IT",
          phone:      body.telefonoDestinatario,
          email:      body.emailDestinatario,
        },
        parcels: [{
          height:      +body.altezza,
          length:      +body.profondita,
          width:       +body.larghezza,
          realWeight:  +body.peso,
          packagingType: 0,
        }],
      };
      const res  = await fetch(`${API}/quotations`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return json({ ok: true, quotations: data.data?.quotations || [] });
    } catch (err) {
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "accept"  →  crea + paga in un colpo
  // ════════════════════════════════════════
  if (step === "accept") {
    try {
      const body = await req.json();
      const jwt  = await getSpediamoToken(AUTHCODE);

      // Forza PDF Alt per SDA/Poste
      const sc = (body.quotation?.serviceCode || "").toLowerCase();
      const labelFormat = sc.includes("sda") || sc.includes("poste") ? 3 : (body.labelFormat ?? 2);

      const payload = {
        sender: {
          name:       body.mittente.name,
          address:    body.mittente.address,
          postalCode: body.mittente.postalCode,
          city:       body.mittente.city,
          province:   body.mittente.province,
          country:    body.mittente.country,
          phone:      body.mittente.phone,
          email:      body.mittente.email,
        },
        consignee: {
          name:       body.nome,
          address:    body.indirizzo,
          address2:   body.indirizzo2 || null,
          postalCode: body.capDestinatario,
          city:       body.cittaDestinatario,
          province:   body.provinciaDestinatario,
          country:    body.nazioneDestinatario || "IT",
          phone:      body.telefono,
          email:      body.email,
          notes:      body.noteDestinatario || null,
        },
        parcels: [{
          height:       +body.altezza,
          length:       +body.profondita,
          width:        +body.larghezza,
          realWeight:   +body.peso,
          packagingType: 0,
        }],
        service:                  body.quotation.service,
        expectedDeliveryDate:     body.quotation.expectedDeliveryDate,
        firstAvailablePickupDate: body.quotation.firstAvailablePickupDate,
        pricing:                  body.quotation.pricing,
        serviceCode:              body.quotation.serviceCode,
        labelOption: { format: labelFormat },
        cashOnDeliveryAmount:     body.importoContrassegno  ?? 0,
        insuranceAmount:          body.importoAssicurazione ?? 0,
        externalReference:        body.shopifyOrderName     || null,
      };

      const res  = await fetch(`${API}/quotations/accept`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return json({ ok: true, spedizione: data.data });
    } catch (err) {
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "labels"
  // ════════════════════════════════════════
  if (step === "labels" && id) {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`${API}/shipments/${id}/labels`, {
        method:  "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      const label = data.data?.labels?.[0];
      if (!label) throw new Error("Nessuna etichetta disponibile");
      return json({
        ok: true,
        label: {
          b64:         label.content,
          contentType: label.contentType || "application/pdf",
          filename:    label.filename    || `etichetta_${id}.pdf`,
        },
      });
    } catch (err) {
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "details"
  // ════════════════════════════════════════
  if (step === "details" && id) {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`${API}/shipments/${id}`, {
        method:  "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return json({ ok: true, spedizione: data.data });
    } catch (err) {
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "cancel"
  // ════════════════════════════════════════
  if (step === "cancel" && id) {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`${API}/shipments/${id}/cancel`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return json({ ok: true });
    } catch (err) {
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "wallet"  →  GET /v2/wallet
  // ════════════════════════════════════════
  if (step === "wallet") {
    try {
      const jwt = await getSpediamoToken(AUTHCODE);
      const res = await fetch(`${API}/wallet`, {
        method:  "GET",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return json({ ok: true, balance: data.data });
    } catch (err) {
      return json({ ok: false, error: err }, 500);
    }
  }

  return json({ ok: false, error: "step non supportato o id mancante" }, 400);
}

