'use client';
import { useState, useEffect } from "react";
import Image from "next/image";

// Utility per rimuovere accenti
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Icone corrieri
function getCorriereIcon(corriere) {
  const c = (corriere || '').toLowerCase();
  if (c.includes("brt")) return (
    <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#E30613"/><text x="14" y="13" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">BRT</text></svg>
  );
  // ... altri corrieri come prima ...
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

const LS_KEY = "spediamo-pro-spedizioni";

export default function Page() {
  const [orders, setOrders] = useState([]);
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null); // shopify order id numerico
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

  // Aggiornamento tracking in differita (ogni 60s)
  useEffect(() => {
    if (!spedizioniCreate.length) return;
    const updateTracking = async () => {
      try {
        const nuove = await Promise.all(
          spedizioniCreate.map(async (el) => {
            const tracking = getTrackingLabel(el.spedizione);
            if (!tracking || !el.spedizione.trackLink) {
              const res = await fetch(`/api/spediamo?step=details&id=${el.spedizione.id}`, { method: "POST" });
              if (res.ok) {
                const details = await res.json();
                return { ...el, spedizione: { ...el.spedizione, ...details.spedizione } };
              }
            }
            return el;
          })
        );
        setSpedizioniCreate(nuove);
      } catch (err) {
        setErrore("Errore aggiornamento tracking: " + err);
      }
    };
    updateTracking();
    const timer = setInterval(updateTracking, 60000);
    return () => clearInterval(timer);
  }, [spedizioniCreate.length]);

  // Carica ordini Shopify da API route
  const handleLoadOrders = async () => {
    setLoading(true);
    setErrore(null);
    setOrders([]);
    setSelectedOrderId(null);
    setForm({
      nome: "", telefono: "", email: "", indirizzo: "", indirizzo2: "",
      capDestinatario: "", cittaDestinatario: "", provinciaDestinatario: "", nazioneDestinatario: "",
      altezza: "10", larghezza: "15", profondita: "20", peso: "1",
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
  };

  // Cerca ordine per numero d'ordine o id e popola form e selectedOrderId (shopify order id)
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
    setSelectedOrderId(found.id); // ID numerico Shopify importante!
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

  // Simula spedizione - chiama API
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
      // CREATE spedizione
      const resC = await fetch(`/api/spediamo?step=create&id=${idSim}&shopifyOrderId=${selectedOrderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consigneePickupPointId: null }),
      });
      if (!resC.ok) throw await resC.json();
      const { spedizione } = await resC.json();

      // UPDATE indirizzi ecc.
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

      // PAY spedizione
      const resP = await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: "POST" });
      let dataP;
      try {
        dataP = await resP.json();
      } catch {
        dataP = {};
      }
      if (!resP.ok) throw dataP;

      // DETTAGLIO TRACKING aggiornato
      const resDetails = await fetch(`/api/spediamo?step=details&id=${spedizione.id}`, { method: "POST" });
      let details = {};
      if (resDetails.ok) {
        details = await resDetails.json();
      }

      // Motivo se pay non ok
      const motivo =
        dataP.message ||
        dataP.error ||
        (typeof dataP === "string" ? dataP : "") ||
        JSON.stringify(dataP, null, 2);

      // Aggiorno cache spedizioniCreate e salvo anche shopifyOrder completo!
      setSpedizioniCreate((prev) => [
        {
          shopifyOrder: orders.find((o) => o.id === Number(selectedOrderId)),
          spedizione: { ...dataUpd.spedizione, ...details.spedizione },
          lastPayReason: !dataP.can_pay ? motivo : "",
          evaso: false,  // flag nuovo per evidenziare se evaso
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
  };

  // Funzione per evadere ordine Shopify (fulfillment)
  const handleEvadi = async (spedizioneId, shopifyOrderId, trackingNumber, carrierName) => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/shopify/fulfill-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: shopifyOrderId, trackingNumber, carrierName }),
      });
      if (!res.ok) throw await res.json();
      await res.json();

      // aggiorna cache spedizioniCreate: evaso=true su quella spedizione
      setSpedizioniCreate((prev) =>
        prev.map((el) =>
          el.spedizione.id === spedizioneId ? { ...el, evaso: true } : el
        )
      );
      alert("✅ Ordine evaso correttamente su Shopify.");
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Stampa o download LDV
  const handlePrintLdv = async (idSpedizione) => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/spediamo?step=ldv&id=${idSpedizione}`, { method: "POST" });
      if (!res.ok) throw await res.json();
      const { ldv } = await res.json();

      // download file così com'è (ZIP o PDF ecc.)
      const byteChars = atob(ldv.b64);
      const bytes = Uint8Array.from(byteChars, (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: ldv.type });

      // Download diretto
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ldv_${idSpedizione}.${ldv.type.includes("zip") ? "zip" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrore(typeof err === "object" ? JSON.stringify(err, null, 2) : err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Cancella cache spedizioni
  const handleCancellaCache = () => {
    if (window.confirm("Vuoi davvero cancellare tutte le spedizioni salvate?")) {
      setSpedizioniCreate([]);
      localStorage.removeItem(LS_KEY);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={logoWrapperStyle}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={220}
          height={90}
          style={{
            width: "220px",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 14px #bbb8)",
            maxWidth: "95vw"
          }}
          priority
        />
      </div>

      <div style={cardStyle}>
        <h2 style={headerStyle}>Gestione Spedizioni Shopify</h2>

        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Da</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} max={dateTo} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>A</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} min={dateFrom} max={new Date().toISOString().split("T")[0]} />
          </div>
          <button onClick={handleLoadOrders} disabled={loading} style={buttonPrimary}>
            {loading ? "Carica..." : "Carica ordini"}
          </button>
        </div>

        <form style={searchRowStyle} onSubmit={handleSearchOrder}>
          <input
            type="text"
            placeholder="Parte del numero d'ordine…"
            value={orderQuery}
            onChange={e => setOrderQuery(e.target.value)}
            style={inputStyle}
            disabled={loading || orders.length === 0}
          />
          <button type="submit" disabled={loading || orders.length === 0} style={buttonPrimary}>
            Cerca
          </button>
        </form>

        {selectedOrderId && (
          <div style={foundStyle}>
            Ordine trovato: <strong>{orders.find(o => o.id === Number(selectedOrderId))?.name}</strong>
          </div>
        )}

        {errore && <div style={errorStyle}>{errore}</div>}

        {selectedOrderId && (
          <form onSubmit={handleSimula} style={simulateFormStyle}>
            <div style={rowStyle}>
              <input
                name="nome"
                placeholder="Destinatario"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                name="telefono"
                placeholder="Telefono"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                required
                style={inputStyle}
              />
            </div>
            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              style={inputStyle}
              type="email"
            />
            <input
              name="indirizzo"
              placeholder="Indirizzo (Via, Numero)"
              value={form.indirizzo}
              onChange={e => setForm({ ...form, indirizzo: removeAccents(e.target.value) })}
              required
              style={inputStyle}
            />
            <input
              name="indirizzo2"
              placeholder="Indirizzo 2"
              value={form.indirizzo2}
              onChange={e => setForm({ ...form, indirizzo2: removeAccents(e.target.value) })}
              style={inputStyle}
            />
            <div style={rowStyle}>
              <input
                name="capDest"
                placeholder="CAP"
                value={form.capDestinatario}
                onChange={e => setForm({ ...form, capDestinatario: e.target.value })}
                required
                style={smallInput}
              />
              <input
                name="citta"
                placeholder="Città"
                value={form.cittaDestinatario}
                onChange={e => setForm({ ...form, cittaDestinatario: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                name="prov"
                placeholder="Prov"
                value={form.provinciaDestinatario}
                onChange={e => setForm({ ...form, provinciaDestinatario: e.target.value })}
                required
                style={smallInput}
              />
              <input
                name="naz"
                placeholder="Nazione"
                value={form.nazioneDestinatario}
                readOnly
                style={smallInput}
              />
            </div>
            <button type="submit" disabled={loading} style={buttonSecondary}>
              {loading ? "Simulando..." : "Simula spedizione"}
            </button>
          </form>
        )}

        {spedizioni.length > 0 && (
          <div style={offersContainer}>
            {spedizioni.map(s => (
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

        {/* Lista spedizioni create con stampa LDV ed evadi */}
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
          {spedizioniCreate.map(({ shopifyOrder, spedizione, lastPayReason, evaso }) => {
            const tracking = getTrackingLabel(spedizione);
            const trackingLink = spedizione.trackLink;
            return (
              <div
                key={spedizione.id}
                style={{
                  ...historyCard,
                  borderColor: evaso ? "#34c759" : "#ff9500",
                  backgroundColor: evaso ? "#e6ffea" : "#fff8e1",
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
                <div>
                  <button
                    onClick={() => handlePrintLdv(spedizione.id)}
                    style={{ ...buttonPrint, marginRight: 8 }}
                    disabled={loading}
                  >
                    Stampa LDV
                  </button>
                  {!evaso && (
                    <button
                      onClick={() =>
                        handleEvadi(
                          spedizione.id,
                          shopifyOrder.id,
                          getTrackingLabel(spedizione),
                          spedizione.corriere
                        )
                      }
                      style={buttonCreate}
                      disabled={loading}
                    >
                      Evadi
                    </button>
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
// ... (qui metti gli stili come prima, copia quelli già usati)
const containerStyle = { /* ... */ };
const logoWrapperStyle = { /* ... */ };
const cardStyle = { /* ... */ };
const headerStyle = { /* ... */ };
const rowStyle = { /* ... */ };
const fieldStyle = { /* ... */ };
const labelStyle = { /* ... */ };
const inputStyle = { /* ... */ };
const smallInput = { /* ... */ };
const buttonPrimary = { /* ... */ };
const buttonSecondary = { /* ... */ };
const buttonCreate = { /* ... */ };
const offerCard = { /* ... */ };
const offerActions = { /* ... */ };
const offerPrice = { /* ... */ };
const offersContainer = { /* ... */ };
const searchRowStyle = { /* ... */ };
const foundStyle = { /* ... */ };
const errorStyle = { /* ... */ };
const simulateFormStyle = { /* ... */ };
const historyContainer = { /* ... */ };
const historyHeader = { /* ... */ };
const historyEmpty = { /* ... */ };
const historyCard = { /* ... */ };
const buttonPrint = { /* ... */ };