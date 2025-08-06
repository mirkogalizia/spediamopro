"use client";

import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase"; // Assumi che il path sia corretto
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

// --- Helpers ---
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function getCorriereIcon(corriere) {
  const c = (corriere || '').toLowerCase();
  if (c.includes("brt")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#E30613"/><text x="14" y="13" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">BRT</text></svg>);
  if (c.includes("gls")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#002776"/><text x="14" y="13" fill="#ffd200" fontSize="12" fontWeight="bold" textAnchor="middle">GLS</text></svg>);
  if (c.includes("sda")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#003A7B"/><text x="14" y="13" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">SDA</text></svg>);
  if (c.includes("poste")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#FFEB3B"/><text x="14" y="13" fill="#003366" fontSize="11" fontWeight="bold" textAnchor="middle">Poste</text></svg>);
  if (c.includes("ups")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#351C15"/><text x="14" y="13" fill="#ffb500" fontSize="12" fontWeight="bold" textAnchor="middle">UPS</text></svg>);
  if (c.includes("tnt")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#ff6c00"/><text x="14" y="13" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">TNT</text></svg>);
  if (c.includes("dhl")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#FDE500"/><text x="14" y="13" fill="#D40511" fontSize="12" fontWeight="bold" textAnchor="middle">DHL</text></svg>);
  if (c.includes("fedex")) return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#fff"/><text x="14" y="13" fill="#4D148C" fontSize="11" fontWeight="bold" textAnchor="middle">FedEx</text></svg>);
  return (<svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#ccc"/><text x="14" y="13" fill="#333" fontSize="11" fontWeight="bold" textAnchor="middle">Corriere</text></svg>);
}
function getTrackingLabel(spedizione) {
  if (Array.isArray(spedizione.colli) && spedizione.colli.length > 0 && spedizione.colli[0].segnacollo) {
    return spedizione.colli[0].segnacollo;
  }
  if (spedizione.tracking_number_corriere) return spedizione.tracking_number_corriere;
  if (spedizione.tracking_number) return spedizione.tracking_number;
  if (spedizione.segnacollo) return spedizione.segnacollo;
  if (spedizione.codice) return spedizione.codice;
  return "";
}
function HoverButton({ style, onClick, children, disabled }) {
  const [hover, setHover] = useState(false);
  const hoverStyle = hover ? { filter: "brightness(85%)" } : {};
  return (
    <button
      style={{ ...style, ...hoverStyle }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

const LS_KEY = "spediamo-pro-spedizioni";

export default function Page() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState(null);

  // Stati
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

  // controllo login firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (!usr) {
        router.push("/");
      } else {
        setUser(usr);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loadingAuth) {
    return <div style={{ padding: 40, textAlign: "center" }}>Caricamento...</div>;
  }

  if (!user) return null;

  // Copia qui tutte le tue funzioni esistenti esattamente così come sono (handleLoadOrders, handleSearchOrder, handleSimula, handleCreaECompletaEPaga, handleEvadiSpedizione, handlePrintLdv, handleCancellaCache)

  // Per esempio:

  async function handleLoadOrders() {
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
      if (dateFrom > dateTo) throw new Error("La data di inizio non può essere dopo la data di fine.");

      const res = await fetch(`/api/shopify?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setErrore(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchOrder(e) {
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
        ship.country_code === "IT"
          ? ship.province_code || ""
          : ship.province || ship.province_code || "",
      nazioneDestinatario: ship.country_code || "",
    }));
  }

  async function handleSimula(e) {
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
  }

  async function handleCreaECompletaEPaga(idSim) {
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
      let dataP;
      try {
        dataP = await resP.json();
      } catch {
        dataP = {};
      }
      if (!resP.ok) throw dataP;

      // DETTAGLIO TRACKING
      const resDetails = await fetch(`/api/spediamo?step=details&id=${spedizione.id}`, { method: "POST" });
      let details = {};
      if (resDetails.ok) {
        details = await resDetails.json();
      }

      // --- MOTIVO PAY ---
      const motivo =
        dataP.message ||
        dataP.error ||
        (typeof dataP === "string" ? dataP : "") ||
        JSON.stringify(dataP, null, 2);

      // Aggiorno storico (merge dati)
      setSpedizioniCreate((prev) => [
        {
          shopifyOrder: orders.find((o) => o.id === Number(selectedOrderId)),
          spedizione: { ...dataUpd.spedizione, ...details.spedizione },
          lastPayReason: !dataP.can_pay ? motivo : "",
          fulfilled: false,
        },
        ...prev.filter((el) => el.spedizione.id !== spedizione.id),
      ]);

      if (dataP.can_pay) {
        alert(`✅ Spedizione #${spedizione.id} creata e pagata!`);
      } else {
        alert(`⚠️ Spedizione #${spedizione.id} creata ma NON pagata.\n\nMotivo:\n${motivo}`);
        console.warn("PAY NON RIUSCITO:", dataP);
      }
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  }

  async function handleEvadiSpedizione(spedizioneObj) {
    setLoading(true);
    setErrore(null);
    try {
      const orderName = spedizioneObj.shopifyOrder?.name || "";
      const foundOrder = orders.find((o) => {
        const plainName = (o.name || "").toLowerCase().replace(/#/g, "");
        return plainName === orderName.toLowerCase().replace(/#/g, "");
      });
      if (!foundOrder) throw new Error(`Impossibile trovare l’ordine ${orderName}`);

      console.log("Provo evadi: ", {
        orderId: foundOrder.id,
        trackingNumber: getTrackingLabel(spedizioneObj.spedizione),
        carrierName: spedizioneObj.spedizione.corriere || "Altro"
      });

      const res = await fetch("/api/shopify/fulfill-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: foundOrder.id,
          trackingNumber: getTrackingLabel(spedizioneObj.spedizione),
          carrierName: spedizioneObj.spedizione.corriere || "Altro",
        }),
      });

      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Risposta NON JSON dal backend oppure vuota: ${text}`);
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Errore evasione");
      }

      setSpedizioniCreate((prev) =>
        prev.map((el) =>
          el.spedizione.id === spedizioneObj.spedizione.id ? { ...el, fulfilled: true } : el
        )
      );

      alert(`✅ Ordine evaso con successo!\nDettagli risposta:\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setErrore(err.message || "Errore evasione ordine");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrintLdv(idSpedizione) {
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `ldv_${idSpedizione}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  }

  function handleCancellaCache() {
    if (window.confirm("Vuoi davvero cancellare tutte le spedizioni salvate?")) {
      setSpedizioniCreate([]);
      localStorage.removeItem(LS_KEY);
    }
  }

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

  return (
    <div style={containerStyle}>
      <div style={logoWrapperStyle}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={220}
          height={90}
          style={{ width: "220px", height: "auto", objectFit: "contain", filter: "drop-shadow(0 2px 14px #bbb8)", maxWidth: "95vw" }}
          priority
        />
      </div>

      <div style={cardStyle}>
        <h2 style={headerStyle}>Gestione Spedizioni Shopify</h2>

        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Da</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} max={dateTo} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>A</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} min={dateFrom} max={new Date().toISOString().split("T")[0]} />
          </div>
          <button onClick={handleLoadOrders} disabled={loading} style={buttonPrimary}>{loading ? "Carica..." : "Carica ordini"}</button>
        </div>

        <form style={searchRowStyle} onSubmit={handleSearchOrder}>
          <input type="text" placeholder="Parte del numero d'ordine…" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} style={inputStyle} disabled={loading || orders.length === 0} />
          <button type="submit" disabled={loading || orders.length === 0} style={buttonPrimary}>Cerca</button>
        </form>

        {selectedOrderId && <div style={foundStyle}>Ordine trovato: <strong>{orders.find((o) => o.id === Number(selectedOrderId))?.name}</strong></div>}

        {errore && <div style={errorStyle}>{errore}</div>}

        {selectedOrderId && (
          <form onSubmit={handleSimula} style={simulateFormStyle}>
            <div style={rowStyle}>
              <input name="nome" placeholder="Destinatario" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required style={inputStyle} />
              <input name="telefono" placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required style={inputStyle} />
            </div>
            <input name="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={inputStyle} type="email" />
            <input name="indirizzo" placeholder="Indirizzo (Via, Numero)" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: removeAccents(e.target.value) })} required style={inputStyle} />
            <input name="indirizzo2" placeholder="Indirizzo 2" value={form.indirizzo2} onChange={(e) => setForm({ ...form, indirizzo2: removeAccents(e.target.value) })} style={inputStyle} />
            <div style={rowStyle}>
              <input name="capDest" placeholder="CAP" value={form.capDestinatario} onChange={(e) => setForm({ ...form, capDestinatario: e.target.value })} required style={smallInput} />
              <input name="citta" placeholder="Città" value={form.cittaDestinatario} onChange={(e) => setForm({ ...form, cittaDestinatario: e.target.value })} required style={inputStyle} />
              <input name="prov" placeholder="Prov" value={form.provinciaDestinatario} onChange={(e) => setForm({ ...form, provinciaDestinatario: e.target.value })} required style={smallInput} />
              <input name="naz" placeholder="Nazione" value={form.nazioneDestinatario} readOnly style={smallInput} />
            </div>
            <button type="submit" disabled={loading} style={buttonSecondary}>{loading ? "Simulando..." : "Simula spedizione"}</button>
          </form>
        )}

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
                  <HoverButton onClick={() => handleCreaECompletaEPaga(s.id)} style={buttonCreate} disabled={loading}>Crea & paga</HoverButton>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={historyContainer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={historyHeader}>Spedizioni storiche</h3>
            {spedizioniCreate.length > 0 && (
              <button style={{ ...buttonSecondary, background: "#ff3b30", color: "#fff", fontSize: 14, padding: "6px 16px" }} onClick={handleCancellaCache}>Cancella cache</button>
            )}
          </div>
          {spedizioniCreate.length === 0 && <div style={historyEmpty}>Nessuna spedizione creata.</div>}
          {spedizioniCreate.map(({ shopifyOrder, spedizione, lastPayReason, fulfilled }) => {
            const tracking = getTrackingLabel(spedizione);
            const trackingLink = spedizione.trackLink;
            return (
              <div
                key={spedizione.id}
                style={{
                  ...historyCard,
                  backgroundColor: fulfilled ? "#e6ffe6" : "#fff3cd",
                  borderColor: fulfilled ? "#28a745" : "#ffc107",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <strong>{shopifyOrder?.name}</strong> · ID {spedizione.id}
                  {" · Tracking: "}
                  {trackingLink && tracking ? (
                    <a href={trackingLink} target="_blank" rel="noopener noreferrer" style={{ color: "#0a84ff", fontWeight: 700 }}>
                      {tracking}
                    </a>
                  ) : tracking ? (
                    <span style={{ fontWeight: 600 }}>{tracking}</span>
                  ) : (
                    <span style={{ color: "#999" }}>non ancora disponibile</span>
                  )}
                  {lastPayReason && (
                    <span style={{ color: "#ff3b30", fontSize: 13, marginLeft: 8 }}>
                      (NON PAGATA: {lastPayReason})
                    </span>
                  )}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <HoverButton onClick={() => handlePrintLdv(spedizione.id)} style={buttonPrint} disabled={loading}>Stampa LDV</HoverButton>
                  {!fulfilled && (
                    <HoverButton onClick={() => handleEvadiSpedizione({ shopifyOrder, spedizione })} style={buttonEvadi} disabled={loading}>Evadi</HoverButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- STILI ---
const containerStyle = {
  minHeight: "100vh",
  background: "#f5f7fa",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  padding: 24,
  fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif",
  color: "#333",
};

const logoWrapperStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 32,
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
  transition: "background-color 0.3s ease",
};

const buttonSecondary = {
  padding: "12px 20px",
  borderRadius: 8,
  border: "none",
  background: "#5ac8fa",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.3s ease",
};

const buttonCreate = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#34c759",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.3s ease",
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
  border: "1px solid #e0e0e0",
};

const buttonPrint = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#ff9500",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 90,
  textAlign: "center",
  transition: "background-color 0.3s ease",
};

const buttonEvadi = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#28a745",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 90,
  textAlign: "center",
  transition: "background-color 0.3s ease",
};