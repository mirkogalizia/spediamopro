'use client';
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ─── Utilities ────────────────────────────────────────────────
function removeAccents(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getTrackingLabel(spedizione) {
  if (!spedizione) return "";
  if (spedizione.trackingCode) return spedizione.trackingCode;
  if (Array.isArray(spedizione.parcels) && spedizione.parcels[0]?.tracking)
    return spedizione.parcels[0].tracking;
  if (Array.isArray(spedizione.colli) && spedizione.colli[0]?.segnacollo)
    return spedizione.colli[0].segnacollo;
  return spedizione.tracking_number_corriere || spedizione.tracking_number || spedizione.segnacollo || "";
}

function getCorriereLabel(spedizione) {
  return spedizione?.courierService?.courier || spedizione?.corriere || "";
}

function getCorriereIcon(corriere) {
  const c = (corriere || "").toLowerCase();
  const cfg = c.includes("sda")
    ? { label: "SDA",  bg: "#fff3cd", color: "#92610a", border: "#fcd34d" }
    : c.includes("brt")
    ? { label: "BRT",  bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" }
    : c.includes("gls")
    ? { label: "GLS",  bg: "#fef9c3", color: "#713f12", border: "#fde047" }
    : c.includes("ups")
    ? { label: "UPS",  bg: "#fef3c7", color: "#78350f", border: "#fbbf24" }
    : c.includes("dhl")
    ? { label: "DHL",  bg: "#ffedd5", color: "#9a3412", border: "#fb923c" }
    : c.includes("poste") || c.includes("inpost")
    ? { label: "POST", bg: "#dbeafe", color: "#1e3a8a", border: "#93c5fd" }
    : { label: "SPD",  bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
  return (
    <div style={{
      flexShrink: 0, width: 44, height: 26,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 800, color: cfg.color, letterSpacing: "0.05em",
    }}>{cfg.label}</div>
  );
}

function HoverButton({ style, onClick, children, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        ...style,
        ...(hover && !disabled ? { filter: "brightness(85%)" } : {}),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "filter 0.15s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      disabled={disabled}
    >{children}</button>
  );
}

function Modal({ tipo, dati, onClose }) {
  if (!dati) return null;
  const isEvadi = tipo === "evadi";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 22px", maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: isEvadi ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {isEvadi ? "📬" : "✅"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{isEvadi ? "Ordine evaso!" : "Spedizione creata!"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{isEvadi ? "Shopify aggiornato con il tracking" : "Spedizione confermata e pagata"}</div>
          </div>
        </div>
        <div style={{ borderRadius: 10, border: "1px solid #f1f5f9", overflow: "hidden", marginBottom: 18 }}>
          {dati.map(({ label, value, highlight }, i) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? "#16a34a" : "#0f172a", maxWidth: 220, textAlign: "right", wordBreak: "break-all" }}>{value || "—"}</span>
            </div>
          ))}
        </div>
        <HoverButton onClick={onClose} style={{ width: "100%", padding: "11px 0", background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, fontWeight: 600, fontSize: 14 }}>Chiudi</HoverButton>
      </div>
    </div>
  );
}

function ConfirmModal({ messaggio, onConfirm, onCancel }) {
  if (!messaggio) return null;
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 22px", maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 28, marginBottom: 12, textAlign: "center" }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", textAlign: "center", marginBottom: 8 }}>Conferma operazione</div>
        <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 22 }}>{messaggio}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <HoverButton onClick={onCancel} style={{ flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 9, fontWeight: 600, fontSize: 13 }}>Annulla</HoverButton>
          <HoverButton onClick={onConfirm} style={{ flex: 1, padding: "10px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 9, fontWeight: 600, fontSize: 13 }}>Conferma</HoverButton>
        </div>
      </div>
    </div>
  );
}

// ─── Costanti ─────────────────────────────────────────────────
const LS_KEY      = "spediamo-pro-v2-spedizioni-3";
const LS_MITTENTE = "spediamo-pro-mittente-3";

const DEFAULT_MITTENTE = {
  name:       "Biscotti Sinceri",
  address:    "Via delle Aleutine 68",
  postalCode: "00121",
  city:       "Ostia Lido",
  country:    "IT",
  province:   "RM",
  phone:      "+393929874134",
  email:      "info@biscottisinceri.it",
};

const LABEL_FORMAT_OPTIONS = [
  { value: 0, label: "PDF (A4)" },
  { value: 1, label: "GIF" },
  { value: 2, label: "ZPL (Zebra)" },
  { value: 3, label: "PDF Alt. (SDA 10×11)" },
];

// ─── Componente principale ─────────────────────────────────────
export default function Page() {
  const router = useRouter();

  const [userChecked,      setUserChecked]      = useState(false);
  const [orders,           setOrders]           = useState([]);
  const [orderQuery,       setOrderQuery]        = useState("");
  const [selectedOrder,    setSelectedOrder]     = useState(null);
  const [dateFrom,         setDateFrom]          = useState("2025-01-01");
  const [dateTo,           setDateTo]            = useState(() => new Date().toISOString().split("T")[0]);
  const [mittente,         setMittente]          = useState(DEFAULT_MITTENTE);
  const [showMittente,     setShowMittente]      = useState(false);
  const [quotations,       setQuotations]        = useState([]);
  const [spedizioniCreate, setSpedizioniCreate]  = useState([]);
  const [loading,          setLoading]           = useState(false);
  const [errore,           setErrore]            = useState(null);
  const [modal,            setModal]             = useState(null);
  const [confirm,          setConfirm]           = useState(null);
  const [wallet,           setWallet]            = useState(null);
  const [walletLoading,    setWalletLoading]     = useState(false);

  const [form, setForm] = useState({
    nome: "", telefono: "", email: "",
    indirizzo: "", indirizzo2: "",
    capDestinatario: "", cittaDestinatario: "",
    provinciaDestinatario: "", nazioneDestinatario: "",
    altezza: "10", larghezza: "15", profondita: "20", peso: "1",
    noteDestinatario: "", labelFormat: 2,
  });

  // ─── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      if (!usr) router.push("/login");
      setUserChecked(true);
    });
    return () => unsub();
  }, [router]);

  // ─── Persist ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) setSpedizioniCreate(JSON.parse(s));
      const m = localStorage.getItem(LS_MITTENTE);
      if (m) setMittente(JSON.parse(m));
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(spedizioniCreate)); }, [spedizioniCreate]);
  useEffect(() => { localStorage.setItem(LS_MITTENTE, JSON.stringify(mittente)); }, [mittente]);

  // ─── Wallet ───────────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await fetch("/api/spediamo3?step=wallet", { method: "POST" });
      if (res.ok) { const d = await res.json(); setWallet(d.balance); }
    } catch {}
    finally { setWalletLoading(false); }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // ─── Auto-refresh tracking ─────────────────────────────────
  const refreshTracking = useCallback(async () => {
    if (!spedizioniCreate.length) return;
    try {
      const aggiornate = await Promise.all(
        spedizioniCreate.map(async (el) => {
          if (el.spedizione?.trackingCode) return el;
          const res = await fetch(`/api/spediamo3?step=details&id=${el.spedizione.id}`, { method: "POST" });
          if (res.ok) { const d = await res.json(); return { ...el, spedizione: { ...el.spedizione, ...d.spedizione } }; }
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

  // ─── Handlers ─────────────────────────────────────────────
  const handleLoadOrders = async () => {
    setLoading(true); setErrore(null); setOrders([]); setSelectedOrder(null); setQuotations([]);
    try {
      if (!dateFrom || !dateTo) throw new Error("Specificare data inizio e fine.");
      if (dateFrom > dateTo) throw new Error("Data inizio successiva alla data fine.");
      const res = await fetch(`/api/shopify3?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) { setErrore(e.message); }
    finally { setLoading(false); }
  };

  const handleSearchOrder = (e) => {
    e.preventDefault(); setErrore(null); setQuotations([]);
    const term = orderQuery.trim().toLowerCase();
    const found = orders.find((o) => {
      const name = (o.name || "").toLowerCase().replace(/#/g, "");
      return name.includes(term) || (o.order_number?.toString() || "").includes(term) || String(o.id) === term;
    });
    if (!found) { setErrore(`Ordine "${orderQuery}" non trovato.`); return; }
    setSelectedOrder(found);
    const ship = found.shipping_address || {};
    setForm((f) => ({
      ...f,
      nome: `${ship.first_name || ""} ${ship.last_name || ""}`.trim(),
      telefono: ship.phone || "", email: found.email || "",
      indirizzo: removeAccents(ship.address1 || ""),
      indirizzo2: removeAccents(ship.address2 || ""),
      capDestinatario: ship.zip || "",
      cittaDestinatario: removeAccents(ship.city || ""),
      provinciaDestinatario: ship.country_code === "IT" ? (ship.province_code || "") : (ship.provincia || ship.province_code || ""),
      nazioneDestinatario: ship.country_code || "IT",
    }));
  };

  const handleQuota = async (e) => {
    e.preventDefault();
    if (!selectedOrder) { setErrore("Seleziona prima un ordine."); return; }
    setLoading(true); setErrore(null); setQuotations([]);
    try {
      const res = await fetch("/api/spediamo3?step=quotations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mittente,
          capDestinatario: form.capDestinatario, cittaDestinatario: form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario, nazioneDestinatario: form.nazioneDestinatario,
          nomeDestinatario: form.nome, indirizzoDestinatario: form.indirizzo,
          telefonoDestinatario: form.telefono, emailDestinatario: form.email,
          altezza: form.altezza, larghezza: form.larghezza, profondita: form.profondita, peso: form.peso,
        }),
      });
      if (!res.ok) throw await res.json();
      const data = await res.json();
      setQuotations(data.quotations || []);
      if (!data.quotations?.length) setErrore("Nessuna quotazione disponibile per questa destinazione.");
    } catch (err) { setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err)); }
    finally { setLoading(false); }
  };

  const handleAccetta = async (quotation) => {
    if (!selectedOrder) { setErrore("Nessun ordine selezionato."); return; }
    setLoading(true); setErrore(null);
    try {
      const res = await fetch("/api/spediamo3?step=accept", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mittente, nome: form.nome, telefono: form.telefono, email: form.email,
          indirizzo: form.indirizzo, indirizzo2: form.indirizzo2 || null,
          capDestinatario: form.capDestinatario, cittaDestinatario: form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario, nazioneDestinatario: form.nazioneDestinatario,
          noteDestinatario: form.noteDestinatario || null,
          altezza: form.altezza, larghezza: form.larghezza, profondita: form.profondita, peso: form.peso,
          labelFormat: form.labelFormat,
          shopifyOrderId: selectedOrder.id, shopifyOrderName: selectedOrder.name,
          importoContrassegno: 0, importoAssicurazione: 0,
          quotation: {
            service: quotation.service,
            expectedDeliveryDate: quotation.expectedDeliveryDate,
            firstAvailablePickupDate: quotation.firstAvailablePickupDate,
            pricing: {
              totalPrice:            quotation.totalPrice            ?? 0,
              basePrice:             quotation.basePrice             ?? 0,
              fuelSurcharge:         quotation.fuelSurcharge         ?? 0,
              accessoryServicePrice: quotation.accessoryServicePrice ?? 0,
              vatAmount:             quotation.vatAmount             ?? 0,
              vatRate:               quotation.vatRate               ?? 0,
            },
            serviceCode: quotation.serviceCode,
          },
        }),
      });
      if (!res.ok) throw await res.json();
      const data = await res.json();
      const spedizione = data.spedizione;
      setSpedizioniCreate((prev) => [
        { shopifyOrder: selectedOrder, spedizione, fulfilled: false, createdAt: new Date().toISOString() },
        ...prev.filter((el) => el.spedizione?.id !== spedizione?.id),
      ]);
      setQuotations([]);
      fetchWallet();
      setModal({
        tipo: "success",
        dati: [
          { label: "Ordine Shopify",  value: selectedOrder.name },
          { label: "ID Spedizione",   value: `#${spedizione.id}` },
          { label: "Corriere",        value: spedizione.courierService?.courier?.toUpperCase() || "—" },
          { label: "Servizio",        value: spedizione.courierService?.code || "—" },
          { label: "Tracking",        value: getTrackingLabel(spedizione) || "in elaborazione…", highlight: true },
          { label: "Consegna prev.",  value: spedizione.expectedDeliveryDate?.split(" ")[0] || "—" },
          { label: "Costo",           value: `€ ${quotation.totalPrice?.toFixed(2)}`, highlight: true },
        ],
      });
    } catch (err) { setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err)); }
    finally { setLoading(false); }
  };

  const handleDownloadLabel = async (idSpedizione) => {
    setLoading(true); setErrore(null);
    try {
      const res = await fetch(`/api/spediamo3?step=labels&id=${idSpedizione}`, { method: "POST" });
      if (!res.ok) throw await res.json();
      const { label } = await res.json();
      const bytes = Uint8Array.from(atob(label.b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: label.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = label.filename || `etichetta_${idSpedizione}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err)); }
    finally { setLoading(false); }
  };

  const handleEvadiSpedizione = async (el) => {
    setLoading(true); setErrore(null);
    try {
      const tracking = getTrackingLabel(el.spedizione);
      const corriere = getCorriereLabel(el.spedizione);
      const foundOrder = orders.find((o) => o.id === el.shopifyOrder?.id) || el.shopifyOrder;
      if (!foundOrder) throw new Error("Ordine Shopify non trovato. Ricarica gli ordini.");
      const res = await fetch("/api/shopify3/fulfill-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: foundOrder.id, trackingNumber: tracking,
          carrierName: corriere.toLowerCase().includes("sda") || corriere.toLowerCase().includes("poste") ? "Poste Italiane" : corriere || "Altro",
        }),
      });
      const ct = res.headers.get("content-type") || "";
      let data;
      if (ct.includes("application/json")) { data = await res.json(); }
      else { const text = await res.text(); throw new Error(`Risposta non JSON: ${text}`); }
      if (!res.ok || data.success === false) throw new Error(data.error || "Errore evasione");
      setSpedizioniCreate((prev) => prev.map((s) => s.spedizione.id === el.spedizione.id ? { ...s, fulfilled: true } : s));
      setModal({
        tipo: "evadi",
        dati: [
          { label: "Ordine Shopify", value: el.shopifyOrder?.name || "—" },
          { label: "Destinatario",   value: el.spedizione.consignee?.name || "—" },
          { label: "Corriere",       value: corriere.toUpperCase() || "—" },
          { label: "Tracking",       value: tracking, highlight: true },
          { label: "Stato",          value: "Evaso su Shopify ✅", highlight: true },
        ],
      });
    } catch (err) { setErrore(err.message || String(err)); }
    finally { setLoading(false); }
  };

  const handleCancella = (idSpedizione) => {
    setConfirm({
      messaggio: `Vuoi cancellare la spedizione #${idSpedizione}? L'operazione non è reversibile.`,
      onConfirm: async () => {
        setConfirm(null); setLoading(true); setErrore(null);
        try {
          const res = await fetch(`/api/spediamo3?step=cancel&id=${idSpedizione}`, { method: "POST" });
          if (!res.ok) throw await res.json();
          setSpedizioniCreate((prev) => prev.filter((el) => el.spedizione.id !== idSpedizione));
          fetchWallet();
        } catch (err) { setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : String(err)); }
        finally { setLoading(false); }
      },
    });
  };

  const handleSvuotaLista = () => {
    setConfirm({
      messaggio: "Svuotare la lista locale delle spedizioni?",
      onConfirm: () => { setConfirm(null); setSpedizioniCreate([]); localStorage.removeItem(LS_KEY); },
    });
  };

  if (!userChecked)
    return <div style={{ padding: 40, textAlign: "center" }}>Caricamento...</div>;

  const balance = wallet?.balance ?? null;
  const walletColor = balance === null ? "#64748b" : balance < 5 ? "#dc2626" : balance < 20 ? "#f59e0b" : "#16a34a";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>
      <Modal tipo={modal?.tipo} dati={modal?.dati} onClose={() => setModal(null)} />
      <ConfirmModal messaggio={confirm?.messaggio} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>🍪</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" }}>Gestione Spedizioni</h1>
            <span style={{ fontSize: 12, color: "#64748b" }}>Biscotti Sinceri — SpediamoPro API v2</span>
          </div>
        </div>
        {/* WALLET */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px" }}>
          <div style={{ fontSize: 18 }}>💳</div>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Wallet</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: walletColor }}>
              {walletLoading ? "..." : balance !== null ? `€ ${Number(balance).toFixed(2)}` : "—"}
            </div>
          </div>
          <HoverButton onClick={fetchWallet} disabled={walletLoading} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4, color: "#94a3b8" }}>🔄</HoverButton>
        </div>
      </div>

      {/* ERRORE */}
      {errore && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, whiteSpace: "pre-wrap", fontSize: 13, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <span>❌ {errore}</span>
          <button onClick={() => setErrore(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* MITTENTE */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: "#64748b" }}>📤 Mittente: </span>
            <span style={{ fontWeight: 600, color: "#3b82f6" }}>{mittente.name}</span>
            <span style={{ color: "#94a3b8" }}> — {mittente.address}, {mittente.city}</span>
          </div>
          <HoverButton style={{ fontSize: 12, padding: "5px 12px", background: "#e2e8f0", border: "none", borderRadius: 7, fontWeight: 500, color: "#475569" }} onClick={() => setShowMittente((v) => !v)}>
            {showMittente ? "✕ Chiudi" : "✏️ Modifica"}
          </HoverButton>
        </div>
        {showMittente && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { key: "name", label: "Nome / Azienda" }, { key: "address", label: "Indirizzo" },
              { key: "postalCode", label: "CAP" },       { key: "city", label: "Città" },
              { key: "province", label: "Provincia" },   { key: "country", label: "Nazione (ISO)" },
              { key: "phone", label: "Telefono" },       { key: "email", label: "Email" },
            ].map(({ key, label }) => (
              <FormField key={key} label={label}>
                <input value={mittente[key] || ""} onChange={(e) => setMittente((m) => ({ ...m, [key]: e.target.value }))}
                  style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, outline: "none" }} />
              </FormField>
            ))}
            <div style={{ gridColumn: "span 2", display: "flex", gap: 10, marginTop: 4 }}>
              <HoverButton style={{ padding: "7px 18px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600 }} onClick={() => setShowMittente(false)}>✅ Salva</HoverButton>
              <HoverButton style={{ padding: "7px 18px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600 }} onClick={() => { setMittente(DEFAULT_MITTENTE); setShowMittente(false); }}>↩ Default</HoverButton>
            </div>
          </div>
        )}
      </div>

      {/* STEP 1 */}
      <Section numero="1" titolo="Carica ordini Shopify">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <DateInput label="Dal" value={dateFrom} onChange={setDateFrom} />
          <DateInput label="Al"  value={dateTo}   onChange={setDateTo} />
          <HoverButton style={{ padding: "7px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 13 }} onClick={handleLoadOrders} disabled={loading}>
            {loading ? "⏳" : orders.length ? `✅ ${orders.length} ordini` : "Carica ordini"}
          </HoverButton>
        </div>
      </Section>

      {/* STEP 2 */}
      {orders.length > 0 && (
        <Section numero="2" titolo="Cerca ordine">
          <form onSubmit={handleSearchOrder} style={{ display: "flex", gap: 10 }}>
            <input value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} placeholder="Numero ordine (es. 1234)"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, outline: "none" }} />
            <HoverButton style={{ padding: "8px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 13 }} disabled={loading}>Cerca</HoverButton>
          </form>
          {selectedOrder && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, border: "1px solid #86efac", color: "#166534" }}>
              ✅ <strong>{selectedOrder.name}</strong> — {selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}, {selectedOrder.shipping_address?.city}
            </div>
          )}
        </Section>
      )}

      {/* STEP 3 */}
      {selectedOrder && (
        <Section numero="3" titolo="Dati destinatario e pacco">
          <form onSubmit={handleQuota}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { key: "nome", label: "Nome destinatario" }, { key: "telefono", label: "Telefono" },
                { key: "email", label: "Email" },            { key: "indirizzo", label: "Indirizzo" },
                { key: "indirizzo2", label: "Indirizzo 2 (opz.)" }, { key: "capDestinatario", label: "CAP" },
                { key: "cittaDestinatario", label: "Città" }, { key: "provinciaDestinatario", label: "Provincia" },
                { key: "nazioneDestinatario", label: "Nazione (ISO)" }, { key: "noteDestinatario", label: "Note (opz.)" },
              ].map(({ key, label }) => (
                <FormField key={key} label={label}>
                  <input value={form[key] || ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, outline: "none" }} />
                </FormField>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { key: "altezza", label: "Altezza (cm)" }, { key: "larghezza", label: "Larghezza (cm)" },
                { key: "profondita", label: "Profondità (cm)" }, { key: "peso", label: "Peso (kg)" },
              ].map(({ key, label }) => (
                <FormField key={key} label={label}>
                  <input type="number" min="0.1" step="0.1" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, outline: "none" }} />
                </FormField>
              ))}
            </div>
            <div style={{ marginBottom: 16, maxWidth: 280 }}>
              <FormField label="🏷️ Formato etichetta">
                <select value={form.labelFormat} onChange={(e) => setForm((f) => ({ ...f, labelFormat: +e.target.value }))}
                  style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, outline: "none" }}>
                  {LABEL_FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Per SDA/Poste viene usato automaticamente PDF Alt. (10×11)</p>
            </div>
            <HoverButton style={{ padding: "10px 28px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14 }} disabled={loading}>
              {loading ? "⏳ Caricamento..." : "🔍 Ottieni quotazioni"}
            </HoverButton>
          </form>
        </Section>
      )}

      {/* STEP 4 */}
      {quotations.length > 0 && (
        <Section numero="4" titolo="Scegli corriere">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quotations.map((q) => (
              <div key={q.service} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {getCorriereIcon(q.serviceCode)}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                      {q.serviceCode} <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{q.deliveryTime}gg</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>📅 {q.expectedDeliveryDate} · 🚚 ritiro {q.firstAvailablePickupDate}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontWeight: 800, fontSize: 17, color: "#16a34a" }}>€ {q.totalPrice?.toFixed(2)}</span>
                  <HoverButton style={{ padding: "8px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => handleAccetta(q)} disabled={loading}>
                    {loading ? "⏳" : "✅ Spedisci"}
                  </HoverButton>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SPEDIZIONI CREATE */}
      {spedizioniCreate.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#0f172a" }}>📋 Spedizioni ({spedizioniCreate.length})</h2>
            <HoverButton style={{ fontSize: 12, padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7 }} onClick={handleSvuotaLista}>🗑 Svuota lista</HoverButton>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {spedizioniCreate.map((el) => {
              const tracking = getTrackingLabel(el.spedizione);
              const corriere = getCorriereLabel(el.spedizione);
              return (
                <div key={el.spedizione.id} style={{ border: `1px solid ${el.fulfilled ? "#86efac" : "#e2e8f0"}`, borderRadius: 10, padding: "14px 16px", background: el.fulfilled ? "#f0fdf4" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {getCorriereIcon(corriere)}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{el.shopifyOrder?.name || "—"}</span>
                          {el.fulfilled && <span style={{ fontSize: 11, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>✅ Evaso</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{el.spedizione.consignee?.name || ""} · {corriere.toUpperCase()} · #{el.spedizione.id}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(el.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 10, padding: "6px 10px", background: "#f8fafc", borderRadius: 7 }}>
                    🔎 <span style={{ color: "#64748b" }}>Tracking: </span>
                    {tracking
                      ? <a href={el.spedizione.trackingUrl || "#"} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontWeight: 600 }}>{tracking}</a>
                      : <span style={{ color: "#94a3b8" }}>in elaborazione…</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <HoverButton style={{ fontSize: 12, padding: "6px 14px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 7 }} onClick={() => handleDownloadLabel(el.spedizione.id)} disabled={loading}>⬇ Etichetta</HoverButton>
                    {!el.fulfilled && (
                      <HoverButton style={{ fontSize: 12, padding: "6px 14px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 7 }} onClick={() => handleEvadiSpedizione(el)} disabled={loading || !tracking} title={!tracking ? "Tracking non ancora disponibile" : ""}>📬 Evadi su Shopify</HoverButton>
                    )}
                    <HoverButton style={{ fontSize: 12, padding: "6px 14px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 7 }} onClick={refreshTracking} disabled={loading}>🔄 Aggiorna</HoverButton>
                    <HoverButton style={{ fontSize: 12, padding: "6px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7 }} onClick={() => handleCancella(el.spedizione.id)} disabled={loading}>✕ Cancella</HoverButton>
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

// ─── UI helpers ───────────────────────────────────────────────
function Section({ numero, titolo, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 22, height: 22, background: "#0f172a", color: "#fff", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{numero}</span>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#0f172a" }}>{titolo}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      {children}
    </label>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "#64748b" }}>{label}:</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, outline: "none" }} />
    </label>
  );
}

