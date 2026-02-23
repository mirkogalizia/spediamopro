// /app/api/spediamo2/route.js

// SpediamoPro API v2 — Store 2

import { getSpediamoToken } from "../../lib/spediamo";

const API = "https://core.spediamopro.com/api/v2";

const DEFAULT_SENDER = {
  name:       "Not For Resale",
  address:    "Via Streetwear 1",
  postalCode: "20100",
  city:       "Milano",
  country:    "IT",
  province:   "MI",
  phone:      "+393313456789",
  email:      "info@notforresale.it",
};

function getQueryParams(req) {
  const url = new URL(req.url, "http://localhost");
  return {
    step: url.searchParams.get("step"),
    id:   url.searchParams.get("id"),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  const { step, id } = getQueryParams(req);

  // ════════════════════════════════════════
  // STEP = "quotations" → POST /v2/quotations
  // ════════════════════════════════════════
  if (step === "quotations") {
    try {
      const body   = await req.json();
      const jwt    = await getSpediamoToken();
      const sender = { ...DEFAULT_SENDER, ...(body.mittente || {}) };

      const safeWeight = (() => {
        const w = parseFloat(body.peso);
        if (isNaN(w)) return 10;
        return Math.max(10, w); // minimo 10 come nel test curl
      })();

      const payload = {
        sender: {
          name:       sender.name,
          address:    sender.address,
          postalCode: sender.postalCode,
          city:       sender.city,
          country:    sender.country,
          province:   sender.province || null,
          phone:      sender.phone,
          email:      sender.email,
        },
        consignee: {
          name:        body.nomeDestinatario       || ".",
          address:     body.indirizzoDestinatario  || ".",
          postalCode:  body.capDestinatario,
          city:        body.cittaDestinatario,
          country:     body.nazioneDestinatario || "IT",
          province:    body.nazioneDestinatario === "IT" ? (body.provinciaDestinatario || null) : null,
          phone:       body.telefonoDestinatario   || sender.phone,
          email:       body.emailDestinatario      || sender.email,
        },
        parcels: [
          {
            height: Math.max(1,  parseFloat(body.altezza)    || 10),
            width:  Math.max(1,  parseFloat(body.larghezza)  || 15),
            length: Math.max(1,  parseFloat(body.profondita) || 20),
            weight: safeWeight,
            type:   0,
          },
        ],
      };

      const res  = await fetch(`${API}/quotations`, {
        method:  "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw data;

      return json({ ok: true, quotations: data.data });
    } catch (err) {
      console.error("SPEDIAMO quotations error:", JSON.stringify(err));
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "accept" → POST /v2/quotations/accept
  // ════════════════════════════════════════
  if (step === "accept") {
    try {
      const body   = await req.json();
      const jwt    = await getSpediamoToken();
      const sender = { ...DEFAULT_SENDER, ...(body.mittente || {}) };

      const serviceCode = (body.quotation?.serviceCode || "").toLowerCase();
      const isSda       = serviceCode.includes("sda") || (body.corriere || "").toLowerCase().includes("sda");
      const labelFormat = isSda ? 3 : (body.labelFormat ?? 2);

      const safeWeight = (() => {
        const w = parseFloat(body.peso);
        if (isNaN(w)) return 10;
        return Math.max(10, w);
      })();

      const q = body.quotation || {};

      const payload = {
        labelFormat,
        consigneeNote:     body.noteDestinatario || null,
        externalId:        body.shopifyOrderId   ? String(body.shopifyOrderId) : null,
        externalReference: body.shopifyOrderName || null,
        deliveryPudo:      null,
        pickup:            null,

        // COD / assicurazione solo se > 0
        ...(body.importoContrassegno  > 0 && { cashOnDeliveryAmount: body.importoContrassegno }),
        ...(body.importoAssicurazione > 0 && { insuredAmount: body.importoAssicurazione }),

        sender: {
          name:         sender.name,
          address:      sender.address,
          postalCode:   sender.postalCode,
          city:         sender.city,
          country:      sender.country,
          province:     sender.province || null,
          phone:        sender.phone,
          email:        sender.email,
          addressLine2: sender.addressLine2 || null,
        },

        consignee: {
          name:         body.nome,
          address:      body.indirizzo,
          addressLine2: body.indirizzo2 || null,
          postalCode:   body.capDestinatario,
          city:         body.cittaDestinatario,
          country:      body.nazioneDestinatario || "IT",
          province:     body.nazioneDestinatario === "IT" ? (body.provinciaDestinatario || null) : null,
          phone:        body.telefono,
          email:        body.email,
        },

        parcels: [
          {
            height: Math.max(1,  parseFloat(body.altezza)    || 10),
            width:  Math.max(1,  parseFloat(body.larghezza)  || 15),
            length: Math.max(1,  parseFloat(body.profondita) || 20),
            weight: safeWeight,
            type:   0,
          },
        ],

        quotation: {
          service:                  q.service,
          serviceCode:              q.serviceCode,
          expectedDeliveryDate:     q.expectedDeliveryDate,
          firstAvailablePickupDate: q.firstAvailablePickupDate,
          priceBreakdown: {
            basePrice:             q.basePrice             ?? q.priceBreakdown?.basePrice             ?? q.totalPrice ?? 0,
            fuelSurcharge:         q.fuelSurcharge         ?? q.priceBreakdown?.fuelSurcharge         ?? 0,
            accessoryServicePrice: q.accessoryServicePrice ?? q.priceBreakdown?.accessoryServicePrice ?? 0,
            vatRate:               q.vatRate               ?? q.priceBreakdown?.vatRate               ?? 0,
            vatAmount:             q.vatAmount             ?? q.priceBreakdown?.vatAmount             ?? 0,
          },
        },
      };

      const res  = await fetch(`${API}/quotations/accept`, {
        method:  "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw data;

      return json({ ok: true, spedizione: data.data });
    } catch (err) {
      console.error("SPEDIAMO accept error:", JSON.stringify(err));
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "labels" → GET /v2/shipments/{id}/labels
  // ════════════════════════════════════════
  if (step === "labels" && id) {
    try {
      const jwt = await getSpediamoToken();
      const res = await fetch(`${API}/shipments/${id}/labels`, {
        method:  "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return json({ ok: false, error: err }, res.status);
      }

      const contentType = res.headers.get("content-type") || "application/octet-stream";
      const filename    = res.headers.get("x-filename") || `label_${id}`;
      const buffer      = await res.arrayBuffer();
      const b64         = Buffer.from(buffer).toString("base64");

      return json({ ok: true, label: { b64, contentType, filename } });
    } catch (err) {
      console.error("SPEDIAMO labels error:", err);
      return json({ ok: false, error: err?.message || err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "details" → GET /v2/shipments/{id}
  // ════════════════════════════════════════
  if (step === "details" && id) {
    try {
      const jwt = await getSpediamoToken();
      const res = await fetch(`${API}/shipments/${id}`, {
        method:  "GET",
        headers: {
          Authorization:  `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) throw data;

      return json({ ok: true, spedizione: data.data });
    } catch (err) {
      console.error("SPEDIAMO details error:", JSON.stringify(err));
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "cancel" → POST /v2/shipments/{id}/cancel
  // ════════════════════════════════════════
  if (step === "cancel" && id) {
    try {
      const jwt = await getSpediamoToken();
      const res = await fetch(`${API}/shipments/${id}/cancel`, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 204) return json({ ok: true });

      const data = await res.json();
      if (!res.ok) throw data;

      return json({ ok: true });
    } catch (err) {
      console.error("SPEDIAMO cancel error:", JSON.stringify(err));
      return json({ ok: false, error: err }, 500);
    }
  }

  // ════════════════════════════════════════
  // STEP = "wallet" → GET /v2/wallet
  // ════════════════════════════════════════
  if (step === "wallet") {
    try {
      const jwt = await getSpediamoToken();
      const res = await fetch(`${API}/wallet`, {
        method:  "GET",
        headers: {
          Authorization:  `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) throw data;

      return json({ ok: true, balance: data.data });
    } catch (err) {
      console.error("SPEDIAMO wallet error:", JSON.stringify(err));
      return json({ ok: false, error: err }, 500);
    }
  }

  return json({ ok: false, error: "step non supportato o id mancante" }, 400);
}
