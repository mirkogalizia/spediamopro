"use client";

import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

// --- Funzioni helper ---

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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
  return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#ccc"/><text x="14" y="13" fill="#333" fontSize="11" fontWeight="bold" textAnchor="middle">Corriere</text></svg>
  );
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

  useEffect(() => {
    const auth = getAuth();
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

  // Le tue funzioni (handleLoadOrders, handleSearchOrder, handleSimula, handleCreaECompletaEPaga, handleEvadiSpedizione, handlePrintLdv, handleCancellaCache) vanno qui senza modifiche rispetto a prima, copiale esattamente.

  // Ti incollo il return JSX completo con stili in coda

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