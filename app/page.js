'use client';
import { useState, useEffect } from "react";

// Rimuove gli accenti da una stringa
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Icone SVG per corrieri
function getCorriereIcon(corriere) {
  const c = (corriere || '').toLowerCase();
  if (c.includes("brt")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#E30613"/><text x="14" y="13" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">BRT</text></svg>
  );
  if (c.includes("gls")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#002776"/><text x="14" y="13" fill="#ffd200" fontSize="12" fontWeight="bold" textAnchor="middle">GLS</text></svg>
  );
  if (c.includes("sda")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#003A7B"/><text x="14" y="13" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">SDA</text></svg>
  );
  if (c.includes("poste")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#FFEB3B"/><text x="14" y="13" fill="#003366" fontSize="11" fontWeight="bold" textAnchor="middle">Poste</text></svg>
  );
  if (c.includes("ups")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#351C15"/><text x="14" y="13" fill="#ffb500" fontSize="12" fontWeight="bold" textAnchor="middle">UPS</text></svg>
  );
  if (c.includes("tnt")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#ff6c00"/><text x="14" y="13" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">TNT</text></svg>
  );
  if (c.includes("dhl")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#FDE500"/><text x="14" y="13" fill="#D40511" fontSize="12" fontWeight="bold" textAnchor="middle">DHL</text></svg>
  );
  if (c.includes("fedex")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#fff"/><text x="14" y="13" fill="#4D148C" fontSize="11" fontWeight="bold" textAnchor="middle">FedEx</text></svg>
  );
  // Default: pacco/van generico
  return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#ccc"/><text x="14" y="13" fill="#333" fontSize="11" fontWeight="bold" textAnchor="middle">Corriere</text></svg>
  );
}

const LS_KEY = "spediamo-pro-spedizioni";

export default function Page() {
  const [orders, setOrders] = useState([]);
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    telefono: "",
    email: "",
    indirizzo: "",
    indirizzo2: "",
    capDestinatario: "",
    cittaDestinatario: "",
    provinciaDestinatario: "",
    nazioneDestinatario: "",
    altezza: "10",
    larghezza: "15",
    profondita: "20",
    peso: "1",
  });
  const [spedizioni, setSpedizioni] = useState([]);
  const [spedizioniCreate, setSpedizioniCreate] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState(null);

  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  // Persistenza localStorage
  useEffect(() => {
    try {
      const salvate = localStorage.getItem(LS_KEY);
      if (salvate) setSpedizioniCreate(JSON.parse(salvate));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(spedizioniCreate));
  }, [spedizioniCreate]);

  // Carica ordini Shopify
  const handleLoadOrders = async () => {
    setLoading(true);
    setErrore(null);
    setOrders([]);
    setSelectedOrderId(null);
    setForm({
      nome: "",
      telefono: "",
      email: "",
      indirizzo: "",
      indirizzo2: "",
      capDestinatario: "",
      cittaDestinatario: "",
      provinciaDestinatario: "",
      nazioneDestinatario: "",
      altezza: "10",
      larghezza: "15",
      profondita: "20",
      peso: "1",
    });
    setSpedizioni([]);

    try {
      if (!dateFrom || !dateTo) throw new Error("Specificare sia la data di inizio che di fine.");
      if (dateFrom > dateTo)   throw new Error("La data di inizio non può essere dopo la data di fine.");

      const res = await fetch(`/api/shopify?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setErrore(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Seleziona ordine e popola form
  const handleSearchOrder = (e) => {
    e.preventDefault();
    setErrore(null);
    setSpedizioni([]);

    const term = orderQuery.trim().toLowerCase();
    const found = orders.find((o) => {
      const plainName = (o.name || "").toLowerCase().replace(/#/g, "");
      const num = o.order_number?.toString() || "";
      const idStr = o.id?.toString() || "";
      return plainName.includes(term) || num.includes(term) || idStr === term;
    });
    if (!found) {
      setErrore(`Nessun ordine trovato per "${orderQuery}".`);
      return;
    }
    setSelectedOrderId(found.id);
    const ship = found.shipping_address || {};
    setForm((f) => ({
      ...f,
      nome: `${ship.first_name || ""} ${ship.last_name || ""}`.trim(),
      telefono: ship.phone || "",
      email: found.email || "",
      indirizzo: removeAccents(ship.address1 || ""),
      indirizzo2: removeAccents(ship.address2 || ""),
      capDestinatario: ship.zip || "",
      cittaDestinatario: removeAccents(ship.city || ""),
      provinciaDestinatario:
        ship.country_code === "IT" ? ship.province_code || "" : ship.province || ship.province_code || "",
      nazioneDestinatario: ship.country_code || "",
    }));
  };

  // Simula spedizione
  const handleSimula = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrore(null);
    setSpedizioni([]);

    if (!selectedOrderId) {
      setErrore("Devi prima selezionare un ordine valido.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/spediamo?step=simula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capDestinatario: form.capDestinatario,
          cittaDestinatario: form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          nazioneDestinatario: form.nazioneDestinatario,
          altezza: form.altezza,
          larghezza: form.larghezza,
          profondita: form.profondita,
          peso: form.peso,
        }),
      });
      if (!res.ok) throw await res.json();
      const data = await res.json();
      setSpedizioni(data.simulazione?.spedizioni || []);
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  };

  // CREA + UPDATE + PAY + DETTAGLI (tracking reale)
  const handleCreaECompletaEPaga = async (idSim) => {
    setLoading(true);
    setErrore(null);
    try {
      // CREATE
      const resC = await fetch(`/api/spediamo?step=create&id=${idSim}&shopifyOrderId=${selectedOrderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consigneePickupPointId: null }),
      });
      if (!resC.ok) throw await resC.json();
      const { spedizione } = await resC.json();

      // UPDATE
      const resU = await fetch(`/api/spediamo?step=update&id=${spedizione.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          telefono: form.telefono,
          email: form.email,
          indirizzo: form.indirizzo,
          indirizzo2: form.indirizzo2,
          capDestinatario: form.capDestinatario,
          cittaDestinatario: form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          noteDestinatario: "",
          consigneePickupPointId: null,
        }),
      });
      if (!resU.ok) throw await resU.json();
      const dataUpd = await resU.json();

      // PAY
      const resP = await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: "POST" });
      if (!resP.ok) throw await resP.json();
      const dataP = await resP.json();

      // DETTAGLIO TRACKING
      const resDetails = await fetch(`/api/spediamo?step=details&id=${spedizione.id}`, { method: "POST" });
      let details = {};
      if (resDetails.ok) {
        details = await resDetails.json();
      }

      // Aggiorno storico (merge dati)
      setSpedizioniCreate((prev) => [
        {
          shopifyOrder: orders.find((o) => o.id === Number(selectedOrderId)),
          spedizione: { ...dataUpd.spedizione, ...details.spedizione },
        },
        ...prev.filter((el) => el.spedizione.id !== spedizione.id),
      ]);

      alert(
        dataP.can_pay
          ? `Spedizione #${spedizione.id} creata e pagata!`
          : `Spedizione #${spedizione.id} creata ma NON pagata.`
      );
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Stampa LDV
  const handlePrintLdv = async (idSpedizione) => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/spediamo?step=ldv&id=${idSpedizione}`, { method: "POST" });
      if (!res.ok) throw await res.json();
      const { ldv } = await res.json();
      const byteChars = atob(ldv.b64);
      const bytes = Uint8Array.from(byteChars, (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: ldv.type });
      const url = URL.createObjectURL(blob);
      const w = window.open("", "_blank");
      w.document.write(
        `<iframe src="${url}" style="width:100%;height:100vh;border:none;" onload="this.contentWindow.print()"></iframe>`
      );
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Cancella la cache delle spedizioni create
  const handleCancellaCache = () => {
    if (window.confirm("Vuoi davvero cancellare tutte le spedizioni salvate?")) {
      setSpedizioniCreate([]);
      localStorage.removeItem(LS_KEY);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headerStyle}>Gestione Spedizioni Shopify</h2>

        {/* Date range & Carica ordini */}
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Da</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} max={dateTo} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>A</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} min={dateFrom} max={new Date().toISOString().split("T")[0]} />
          </div>
          <button onClick={handleLoadOrders} disabled={loading} style={buttonPrimary}>
            {loading ? "Carica..." : "Carica ordini"}
          </button>
        </div>

        {/* Cerca ordine */}
        <form style={searchRowStyle} onSubmit={handleSearchOrder}>
          <input type="text" placeholder="Parte del numero d'ordine…" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} style={inputStyle} disabled={loading || orders.length === 0} />
          <button type="submit" disabled={loading || orders.length === 0} style={buttonPrimary}>
            Cerca
          </button>
        </form>

        {selectedOrderId && (
          <div style={foundStyle}>
            Ordine trovato: <strong>{orders.find((o) => o.id === Number(selectedOrderId))?.name}</strong>
          </div>
        )}

        {errore && <div style={errorStyle}>{errore}</div>}

        {/* Form Simulazione */}
        {selectedOrderId && (
          <form onSubmit={handleSimula} style={simulateFormStyle}>
            <div style={rowStyle}>
              <input name="nome" placeholder="Destinatario" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required style={inputStyle} />
              <input name="telefono" placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required style={inputStyle} />
            </div>
            <input name="indirizzo" placeholder="Indirizzo (Via, Numero)" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: removeAccents(e.target.value) })} required style={inputStyle} />
            <input name="indirizzo2" placeholder="Indirizzo 2" value={form.indirizzo2} onChange={(e) => setForm({ ...form, indirizzo2: removeAccents(e.target.value) })} style={inputStyle} />
            <div style={rowStyle}>
              <input name="capDest" placeholder="CAP" value={form.capDestinatario} onChange={(e) => setForm({ ...form, capDestinatario: e.target.value })} required style={smallInput} />
              <input name="citta" placeholder="Città" value={form.cittaDestinatario} onChange={(e) => setForm({ ...form, cittaDestinatario: e.target.value })} required style={inputStyle} />
              <input name="prov" placeholder="Prov" value={form.provinciaDestinatario} onChange={(e) => setForm({ ...form, provinciaDestinatario: e.target.value })} required style={smallInput} />
              <input name="naz" placeholder="Nazione" value={form.nazioneDestinatario} readOnly style={smallInput} />
            </div>
            <button type="submit" disabled={loading} style={buttonSecondary}>
              {loading ? "Simulando..." : "Simula spedizione"}
            </button>
          </form>
        )}

        {/* Offerte disponibili */}
        {spedizioni.length > 0 && (
          <div style={offersContainer}>
            {spedizioni.map((s) => (
              <div key={s.id} style={offerCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {getCorriereIcon(s.corriere)}
                  <span style={{ fontWeight: 600, marginLeft: 2 }}>{s.corriere}</span>
                  <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>ID {s.id}</span>
                </div>
                <div style={offerActions}>
                  <div style={offerPrice}>{parseFloat(s.tariffa).toFixed(2)} €</div>
                  <button onClick={() => handleCreaECompletaEPaga(s.id)} disabled={loading} style={buttonCreate}>
                    Crea & paga
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spedizioni generate */}
        <div style={historyContainer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={historyHeader}>Spedizioni storiche</h3>
            {spedizioniCreate.length > 0 && (
              <button
                style={{ ...buttonSecondary, background: "#ff3b30", color: "#fff", fontSize: 14, padding: "6px 16px" }}
                onClick={handleCancellaCache}
              >
                Cancella cache
              </button>
            )}
          </div>
          {spedizioniCreate.length === 0 && <div style={historyEmpty}>Nessuna spedizione creata.</div>}
          {spedizioniCreate.map(({ shopifyOrder, spedizione }) => (
            <div key={spedizione.id} style={historyCard}>
              <span>
                <strong>{shopifyOrder?.name}</strong> · ID {spedizione.id}
                {spedizione.tracking_number && <> · Tracking: {spedizione.tracking_number}</>}
                {!spedizione.tracking_number && spedizione.codice && <> · Tracking: {spedizione.codice}</>}
              </span>
              <button onClick={() => handlePrintLdv(spedizione.id)} style={buttonPrint}>
                Stampa LDV
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── STILI ──
const containerStyle = {
  minHeight: "100vh",
  background: "#f5f7fa",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
  fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif",
  color: "#333",
};
const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: 32,
  width: "100%",
  maxWidth: 600,
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};
const headerStyle = { fontSize: 24, fontWeight: 700 };
const rowStyle = { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" };
const fieldStyle = { flex: 1, display: "flex", flexDirection: "column" };
const labelStyle = { marginBottom: 4, fontSize: 14, color: "#555" };
const inputStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  fontSize: 15,
  color: "#333",
  flex: 1,
};
const smallInput = { ...inputStyle, maxWidth: 90 };
const buttonPrimary = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#007aff",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
const buttonSecondary = {
  padding: "12px 20px",
  borderRadius: 8,
  border: "none",
  background: "#5ac8fa",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
const buttonCreate = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#34c759",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
const offerCard = {
  background: "#fafafa",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const offerHeader = { fontWeight: 600 };
const offerId = { fontSize: 12, color: "#999" };
const offerActions = { display: "flex", alignItems: "center", gap: 12 };
const offerPrice = { fontWeight: 700 };
const offersContainer = { display: "flex", flexDirection: "column", gap: 12 };
const searchRowStyle = { display: "flex", gap: 12 };
const foundStyle = { fontSize: 16, color: "#0a84ff" };
const errorStyle = { color: "#ff3b30", fontSize: 14 };
const simulateFormStyle = { display: "flex", flexDirection: "column", gap: 12 };
const historyContainer = { marginTop: 24, display: "flex", flexDirection: "column", gap: 12 };
const historyHeader = { fontSize: 18, fontWeight: 600 };
const historyEmpty = { color: "#777" };
const historyCard = {
  background: "#f9f9f9",
  borderRadius: 10,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e0e0e0",
};
const buttonPrint = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  background: "#ff9500",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

