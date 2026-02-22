'use client';
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

// ─── Utilities ───────────────────────────────────────────────
function removeAccents(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ✅ API v2: tracking dal campo diretto trackingCode
function getTrackingLabel(spedizione) {
  if (!spedizione) return "";
  if (spedizione.trackingCode) return spedizione.trackingCode;
  if (Array.isArray(spedizione.parcels) && spedizione.parcels[0]?.tracking)
    return spedizione.parcels[0].tracking;
  // fallback legacy v1
  if (Array.isArray(spedizione.colli) && spedizione.colli[0]?.segnacollo)
    return spedizione.colli[0].segnacollo;
  return spedizione.tracking_number_corriere || spedizione.tracking_number || spedizione.segnacollo || "";
}

function getCorriereLabel(spedizione) {
  return spedizione?.courierService?.courier || spedizione?.corriere || "";
}

function getCorriereIcon(corriere) {
  const c = (corriere || "").toLowerCase();
  if (c.includes("brt"))   return <Image src="/icons/brt.png"   alt="BRT"   width={28} height={28} />;
  if (c.includes("gls"))   return <Image src="/icons/gls.png"   alt="GLS"   width={28} height={28} />;
  if (c.includes("sda"))   return <Image src="/icons/sda.png"   alt="SDA"   width={28} height={28} />;
  if (c.includes("poste")) return <Image src="/icons/poste.png" alt="Poste" width={28} height={28} />;
  if (c.includes("ups"))   return <Image src="/icons/ups.png"   alt="UPS"   width={28} height={28} />;
  if (c.includes("dhl"))   return <Image src="/icons/dhl.png"   alt="DHL"   width={28} height={28} />;
  return <Image src="/icons/default.png" alt="Corriere" width={28} height={28} />;
}

function HoverButton({ style, onClick, children, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        ...style,
        ...(hover && !disabled ? { filter: "brightness(85%)" } : {}),
        opacity: disabled ? 0.5 : 1,
        cursor:  disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ─── Costanti ────────────────────────────────────────────────
const LS_KEY      = "spediamo-pro-v2-spedizioni-2";
const LS_MITTENTE = "spediamo-pro-mittente-2";

const DEFAULT_MITTENTE = {
  name:       "Not For Resale",
  address:    "Via Streetwear 1",
  postalCode: "20100",
  city:       "Milano",
  country:    "IT",
  province:   "MI",
  phone:      "+393313456789",
  email:      "info@notforresale.it",
};

const LABEL_FORMAT_OPTIONS = [
  { value: 0, label: "PDF (A4)" },
  { value: 1, label: "GIF" },
  { value: 2, label: "ZPL (Zebra)" },
  { value: 3, label: "PDF Alt. (SDA 10×11)" },
];

// ─── Componente principale ────────────────────────────────────
export default function Page() {
  const router = useRouter();

  const [userChecked, setUserChecked] = useState(false);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      if (!usr) router.push("/login");
      setUserChecked(true);
    });
    return () => unsub();
  }, [router]);

  const [orders,        setOrders]        = useState([]);
  const [orderQuery,    setOrderQuery]     = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dateFrom,      setDateFrom]      = useState("2025-01-01");
  const [dateTo,        setDateTo]        = useState(() => new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    nome: "", telefono: "", email: "",
    indirizzo: "", indirizzo2: "",
    capDestinatario: "", cittaDestinatario: "",
    provinciaDestinatario: "", nazioneDestinatario: "",
    altezza: "10", larghezza: "15", profondita: "20", peso: "1",
    noteDestinatario: "",
    labelFormat: 2,
  });

  const [mittente,     setMittente]     = useState(DEFAULT_MITTENTE);
  const [showMittente, setShowMittente] = useState(false);
  const [quotations,   setQuotations]   = useState([]);
  const [spedizioniCreate, setSpedizioniCreate] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errore,  setErrore]  = useState(null);

  // ─── Persist ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) setSpedizioniCreate(JSON.parse(s));
      const m = localStorage.getItem(LS_MITTENTE);
      if (m) setMittente(JSON.parse(m));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(spedizioniCreate));
  }, [spedizioniCreate]);

  useEffect(() => {
    localStorage.setItem(LS_MITTENTE, JSON.stringify(mittente));
  }, [mittente]);

  // ─── Auto-refresh tracking ─────────────────────────────────
  const refreshTracking = useCallback(async () => {
    if (!spedizioniCreate.length) return;
    try {
      const aggiornate = await Promise.all(
        spedizioniCreate.map(async (el) => {
          if (el.spedizione?.trackingCode) return el;
          const res = await fetch(`/api/spediamo2?step=details&id=${el.spedizione.id}`, { method: "POST" });
          if (res.ok) {
            const d = await res.json();
            return { ...el, spedizione: { ...el.spedizione, ...d.spedizione } };
          }
          return el;
        })
      );
      setSpedizioniCreate(aggiornate);
    } catch {}
  }, [spedizioniCreate.length]);

  useEffect(() => {
    refreshTracking();
    const t = setInterval(refreshTracking, 60000);
    return () => clearInterval(t);
  }, [refreshTracking]);

  // ─── Carica ordini Shopify 2 ───────────────────────────────
  const handleLoadOrders = async () => {
    setLoading(true);
    setErrore(null);
    setOrders([]);
    setSelectedOrder(null);
    setQuotations([]);
    try {
      if (!dateFrom || !dateTo) throw new Error("Specificare data inizio e fine.");
      if (dateFrom > dateTo)    throw new Error("Data inizio successiva alla data fine.");
      const res  = await fetch(`/api/shopify2?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setErrore(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Cerca ordine ──────────────────────────────────────────
  const handleSearchOrder = (e) => {
    e.preventDefault();
    setErrore(null);
    setQuotations([]);
    const term  = orderQuery.trim().toLowerCase();
    const found = orders.find((o) => {
      const name = (o.name || "").toLowerCase().replace(/#/g, "");
      return (
        name.includes(term) ||
        (o.order_number?.toString() || "").includes(term) ||
        String(o.id) === term
      );
    });
    if (!found) { setErrore(`Ordine "${orderQuery}" non trovato.`); return; }
    setSelectedOrder(found);
    const ship = found.shipping_address || {};
    setForm((f) => ({
      ...f,
      nome:                  `${ship.first_name || ""} ${ship.last_name || ""}`.trim(),
      telefono:              ship.phone || "",
      email:                 found.email || "",
      indirizzo:             removeAccents(ship.address1 || ""),
      indirizzo2:            removeAccents(ship.address2 || ""),
      capDestinatario:       ship.zip || "",
      cittaDestinatario:     removeAccents(ship.city || ""),
      provinciaDestinatario: ship.country_code === "IT"
        ? (ship.province_code || "")
        : (ship.provincia || ship.province_code || ""),
      nazioneDestinatario:   ship.country_code || "IT",
    }));
  };

  // ─── Ottieni quotazioni ────────────────────────────────────
  const handleQuota = async (e) => {
    e.preventDefault();
    if (!selectedOrder) { setErrore("Seleziona prima un ordine."); return; }
    setLoading(true);
    setErrore(null);
    setQuotations([]);
    try {
      const res = await fetch("/api/spediamo2?step=quotations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mittente,
          capDestinatario:       form.capDestinatario,
          cittaDestinatario:     form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          nazioneDestinatario:   form.nazioneDestinatario,
          nomeDestinatario:      form.nome,
          indirizzoDestinatario: form.indirizzo,
          telefonoDestinatario:  form.telefono,
          emailDestinatario:     form.email,
          altezza:               form.altezza,
          larghezza:             form.larghezza,
          profondita:            form.profondita,
          peso:                  form.peso,
        }),
      });
      if (!res.ok) throw await res.json();
      const data = await res.json();
      setQuotations(data.quotations || []);
      if (!data.quotations?.length)
        setErrore("Nessuna quotazione disponibile per questa destinazione.");
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Accetta quotazione → crea + paga spedizione ──────────
  const handleAccetta = async (quotation) => {
    if (!selectedOrder) { setErrore("Nessun ordine selezionato."); return; }
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/spediamo2?step=accept", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mittente,
          nome:                  form.nome,
          telefono:              form.telefono,
          email:                 form.email,
          indirizzo:             form.indirizzo,
          indirizzo2:            form.indirizzo2 || null,
          capDestinatario:       form.capDestinatario,
          cittaDestinatario:     form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          nazioneDestinatario:   form.nazioneDestinatario,
          noteDestinatario:      form.noteDestinatario || null,
          altezza:               form.altezza,
          larghezza:             form.larghezza,
          profondita:            form.profondita,
          peso:                  form.peso,
          labelFormat:           form.labelFormat,
          shopifyOrderId:        selectedOrder.id,
          shopifyOrderName:      selectedOrder.name,
          importoContrassegno:   0,
          importoAssicurazione:  0,
          quotation: {
            service:                  quotation.service,
            expectedDeliveryDate:     quotation.expectedDeliveryDate,
            firstAvailablePickupDate: quotation.firstAvailablePickupDate,
            pricing:                  quotation.pricing,
            serviceCode:              quotation.serviceCode,
          },
        }),
      });
      if (!res.ok) throw await res.json();
      const data       = await res.json();
      const spedizione = data.spedizione;

      setSpedizioniCreate((prev) => [
        {
          shopifyOrder: selectedOrder,
          spedizione,
          fulfilled: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.filter((el) => el.spedizione?.id !== spedizione?.id),
      ]);
      setQuotations([]);
      alert(`✅ Spedizione #${spedizione.id} creata!\nTracking: ${getTrackingLabel(spedizione) || "in elaborazione..."}`);
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Scarica etichetta ─────────────────────────────────────
  const handleDownloadLabel = async (idSpedizione) => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/spediamo2?step=labels&id=${idSpedizione}`, { method: "POST" });
      if (!res.ok) throw await res.json();
      const { label } = await res.json();
      const bytes     = Uint8Array.from(atob(label.b64), (c) => c.charCodeAt(0));
      const blob      = new Blob([bytes], { type: label.contentType });
      const url       = URL.createObjectURL(blob);
      const a         = document.createElement("a");
      a.href          = url;
      a.download      = label.filename || `etichetta_${idSpedizione}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Evadi ordine su Shopify 2 ─────────────────────────────
  const handleEvadiSpedizione = async (el) => {
    setLoading(true);
    setErrore(null);
    try {
      const tracking   = getTrackingLabel(el.spedizione);
      const corriere   = getCorriereLabel(el.spedizione);
      const foundOrder = orders.find((o) => o.id === el.shopifyOrder?.id) || el.shopifyOrder;
      if (!foundOrder) throw new Error("Ordine Shopify non trovato. Ricarica gli ordini.");

      const res = await fetch("/api/shopify2/fulfill-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:        foundOrder.id,
          trackingNumber: tracking,
          carrierName:    corriere.toLowerCase().includes("sda") || corriere.toLowerCase().includes("poste")
            ? "Poste Italiane"
            : corriere || "Altro",
        }),
      });

      // ✅ if/else — niente await dentro arrow non-async
      const ct = res.headers.get("content-type") || "";
      let data;
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Risposta non JSON dal backend: ${text}`);
      }

      if (!res.ok || data.success === false)
        throw new Error(data.error || "Errore evasione");

      setSpedizioniCreate((prev) =>
        prev.map((s) =>
          s.spedizione.id === el.spedizione.id ? { ...s, fulfilled: true } : s
        )
      );
      alert(`✅ Ordine evaso con successo!\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setErrore(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Cancella spedizione ───────────────────────────────────
  const handleCancella = async (idSpedizione) => {
    if (!window.confirm(`Cancellare la spedizione #${idSpedizione}?`)) return;
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/spediamo2?step=cancel&id=${idSpedizione}`, { method: "POST" });
      if (!res.ok) throw await res.json();
      setSpedizioniCreate((prev) =>
        prev.filter((el) => el.spedizione.id !== idSpedizione)
      );
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Guard auth ────────────────────────────────────────────
  if (!userChecked)
    return <div style={{ padding: 40, textAlign: "center" }}>Caricamento...</div>;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>📦 Gestione Spedizioni — Store 2</h1>

      {/* ── ERRORE ───────────────────────────────────────────── */}
      {errore && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", borderRadius: 8, padding: "12px 16px", marginBottom: 16, whiteSpace: "pre-wrap", fontSize: 13 }}>
          ❌ {errore}
          <button onClick={() => setErrore(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── MITTENTE ─────────────────────────────────────────── */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            📤 Mittente: <span style={{ color: "#3b82f6" }}>{mittente.name}</span> — {mittente.address}, {mittente.city}
          </span>
          <HoverButton
            style={{ fontSize: 12, padding: "4px 12px", background: "#e2e8f0", border: "none", borderRadius: 6 }}
            onClick={() => setShowMittente((v) => !v)}
          >
            {showMittente ? "Chiudi" : "✏️ Modifica"}
          </HoverButton>
        </div>

        {showMittente && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { key: "name",       label: "Nome / Azienda" },
              { key: "address",    label: "Indirizzo" },
              { key: "postalCode", label: "CAP" },
              { key: "city",       label: "Città" },
              { key: "province",   label: "Provincia (sigla)" },
              { key: "country",    label: "Nazione (ISO)" },
              { key: "phone",      label: "Telefono" },
              { key: "email",      label: "Email" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13 }}>
                {label}
                <input
                  value={mittente[key] || ""}
                  onChange={(e) => setMittente((m) => ({ ...m, [key]: e.target.value }))}
                  style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                />
              </label>
            ))}
            <div style={{ gridColumn: "span 2", display: "flex", gap: 10, marginTop: 4 }}>
              <HoverButton
                style={{ padding: "6px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13 }}
                onClick={() => setShowMittente(false)}
              >
                ✅ Salva mittente
              </HoverButton>
              <HoverButton
                style={{ padding: "6px 16px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13 }}
                onClick={() => { setMittente(DEFAULT_MITTENTE); setShowMittente(false); }}
              >
                ↩ Ripristina default
              </HoverButton>
            </div>
          </div>
        )}
      </div>

      {/* ── CARICA ORDINI ─────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>1. Carica ordini Shopify</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>
            Dal:
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ marginLeft: 6, padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
          </label>
          <label style={{ fontSize: 13 }}>
            Al:
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={{ marginLeft: 6, padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
          </label>
          <HoverButton
            style={{ padding: "6px 18px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600 }}
            onClick={handleLoadOrders}
            disabled={loading}
          >
            {loading ? "..." : `Carica${orders.length ? ` (${orders.length})` : ""}`}
          </HoverButton>
        </div>
      </div>

      {/* ── CERCA ORDINE ──────────────────────────────────────── */}
      {orders.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>2. Cerca ordine</h2>
          <form onSubmit={handleSearchOrder} style={{ display: "flex", gap: 10 }}>
            <input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Numero ordine (es. 1234)"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
            />
            <HoverButton
              style={{ padding: "8px 18px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600 }}
              disabled={loading}
            >
              Cerca
            </HoverButton>
          </form>
          {selectedOrder && (
            <div style={{ marginTop: 12, padding: 10, background: "#f0fdf4", borderRadius: 8, fontSize: 13, border: "1px solid #86efac" }}>
              ✅ <strong>{selectedOrder.name}</strong> — {selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}, {selectedOrder.shipping_address?.city}
            </div>
          )}
        </div>
      )}

      {/* ── FORM DESTINATARIO + PACCO ──────────────────────────── */}
      {selectedOrder && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>3. Dati destinatario e pacco</h2>
          <form onSubmit={handleQuota}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { key: "nome",                  label: "Nome destinatario" },
                { key: "telefono",              label: "Telefono" },
                { key: "email",                 label: "Email" },
                { key: "indirizzo",             label: "Indirizzo" },
                { key: "indirizzo2",            label: "Indirizzo 2 (opz.)" },
                { key: "capDestinatario",       label: "CAP" },
                { key: "cittaDestinatario",     label: "Città" },
                { key: "provinciaDestinatario", label: "Provincia" },
                { key: "nazioneDestinatario",   label: "Nazione (ISO)" },
                { key: "noteDestinatario",      label: "Note consegna (opz.)" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13 }}>
                  {label}
                  <input
                    value={form[key] || ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                  />
                </label>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
              {[
                { key: "altezza",    label: "Altezza (cm)" },
                { key: "larghezza",  label: "Larghezza (cm)" },
                { key: "profondita", label: "Profondità (cm)" },
                { key: "peso",       label: "Peso (kg)" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13 }}>
                  {label}
                  <input
                    type="number" min="0" step="0.1"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                  />
                </label>
              ))}
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, marginBottom: 14, maxWidth: 280 }}>
              🏷️ Formato etichetta
              <select
                value={form.labelFormat}
                onChange={(e) => setForm((f) => ({ ...f, labelFormat: +e.target.value }))}
                style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
              >
                {LABEL_FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Per SDA/Poste viene usato automaticamente PDF Alt. (10×11)
              </span>
            </label>

            <HoverButton
              style={{ padding: "9px 24px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14 }}
              disabled={loading}
            >
              {loading ? "Caricamento..." : "🔍 Ottieni quotazioni"}
            </HoverButton>
          </form>
        </div>
      )}

      {/* ── LISTA QUOTAZIONI ──────────────────────────────────── */}
      {quotations.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>4. Scegli corriere</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quotations.map((q) => (
              <div
                key={q.service}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fafafa" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {getCorriereIcon(q.serviceCode)}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {q.serviceCode} <span style={{ color: "#64748b", fontWeight: 400 }}>({q.deliveryTime} gg)</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Consegna: {q.expectedDeliveryDate} · Ritiro: {q.firstAvailablePickupDate}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#16a34a" }}>
                    € {q.totalPrice?.toFixed(2)}
                  </span>
                  <HoverButton
                    style={{ padding: "7px 18px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 13 }}
                    onClick={() => handleAccetta(q)}
                    disabled={loading}
                  >
                    {loading ? "..." : "✅ Spedisci"}
                  </HoverButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SPEDIZIONI CREATE ──────────────────────────────────── */}
      {spedizioniCreate.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>
              📋 Spedizioni create ({spedizioniCreate.length})
            </h2>
            <HoverButton
              style={{ fontSize: 12, padding: "4px 12px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6 }}
              onClick={() => {
                if (window.confirm("Svuotare la lista locale?")) {
                  setSpedizioniCreate([]);
                  localStorage.removeItem(LS_KEY);
                }
              }}
            >
              🗑 Svuota lista
            </HoverButton>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {spedizioniCreate.map((el) => {
              const tracking = getTrackingLabel(el.spedizione);
              const corriere = getCorriereLabel(el.spedizione);
              return (
                <div
                  key={el.spedizione.id}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", background: el.fulfilled ? "#f0fdf4" : "#fff" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {getCorriereIcon(corriere)}
                      <span style={{ fontWeight: 700 }}>{el.shopifyOrder?.name || "—"}</span>
                      <span style={{ color: "#64748b", fontSize: 13 }}>
                        {el.spedizione.consignee?.name || el.spedizione.nome || ""}
                      </span>
                      {el.fulfilled && (
                        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ Evaso</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      ID: {el.spedizione.id} · {corriere}
                    </div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    🔎 Tracking:{" "}
                    {tracking ? (
                      <a
                        href={el.spedizione.trackingUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#3b82f6" }}
                      >
                        {tracking}
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>in elaborazione…</span>
                    )}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <HoverButton
                      style={{ fontSize: 12, padding: "5px 14px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6 }}
                      onClick={() => handleDownloadLabel(el.spedizione.id)}
                      disabled={loading}
                    >
                      ⬇ Etichetta
                    </HoverButton>

                    {!el.fulfilled && (
                      <HoverButton
                        style={{ fontSize: 12, padding: "5px 14px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6 }}
                        onClick={() => handleEvadiSpedizione(el)}
                        disabled={loading || !tracking}
                        title={!tracking ? "Tracking non ancora disponibile" : ""}
                      >
                        📬 Evadi su Shopify
                      </HoverButton>
                    )}

                    <HoverButton
                      style={{ fontSize: 12, padding: "5px 14px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6 }}
                      onClick={refreshTracking}
                      disabled={loading}
                    >
                      🔄 Aggiorna tracking
                    </HoverButton>

                    <HoverButton
                      style={{ fontSize: 12, padding: "5px 14px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6 }}
                      onClick={() => handleCancella(el.spedizione.id)}
                      disabled={loading}
                    >
                      ✕ Cancella
                    </HoverButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
