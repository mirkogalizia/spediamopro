'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

// ─── Utilities ───────────────────────────────────────────────
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getCorriereIcon(corriere) {
  const c = (corriere || "").toLowerCase();
  if (c.includes("brt"))    return <Image src="/icons/brt.png"    alt="BRT"    width={32} height={32} />;
  if (c.includes("gls"))    return <Image src="/icons/gls.png"    alt="GLS"    width={32} height={32} />;
  if (c.includes("sda"))    return <Image src="/icons/sda.png"    alt="SDA"    width={32} height={32} />;
  if (c.includes("poste"))  return <Image src="/icons/poste.png"  alt="Poste"  width={32} height={32} />;
  if (c.includes("ups"))    return <Image src="/icons/ups.png"    alt="UPS"    width={32} height={32} />;
  if (c.includes("tnt"))    return <Image src="/icons/tnt.png"    alt="TNT"    width={32} height={32} />;
  if (c.includes("dhl"))    return <Image src="/icons/dhl.png"    alt="DHL"    width={32} height={32} />;
  if (c.includes("fedex"))  return <Image src="/icons/fedex.png"  alt="FedEx"  width={32} height={32} />;
  return <Image src="/icons/default.png" alt="Corriere" width={32} height={32} />;
}

// ✅ FIX tracking: priorità corretta per SDA/Poste
function getTrackingLabel(spedizione) {
  if (!spedizione) return "";
  const corriere = (spedizione.corriere || "").toLowerCase();
  // Per SDA/Poste forza sempre il segnacollo del collo
  if (corriere.includes("sda") || corriere.includes("poste")) {
    if (Array.isArray(spedizione.colli) && spedizione.colli.length > 0 && spedizione.colli[0].segnacollo)
      return spedizione.colli[0].segnacollo;
    if (spedizione.segnacollo) return spedizione.segnacollo;
  }
  // Logica standard per tutti gli altri
  if (Array.isArray(spedizione.colli) && spedizione.colli.length > 0 && spedizione.colli[0].segnacollo)
    return spedizione.colli[0].segnacollo;
  if (spedizione.tracking_number_corriere) return spedizione.tracking_number_corriere;
  if (spedizione.tracking_number)          return spedizione.tracking_number;
  if (spedizione.segnacollo)               return spedizione.segnacollo;
  if (spedizione.codice)                   return spedizione.codice;
  return "";
}

function HoverButton({ style, onClick, children, disabled }) {
  const [hover, setHover] = useState(false);
  const hoverStyle = hover ? { filter: "brightness(85%)" } : {};
  return (
    <button
      style={{ ...style, ...hoverStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// 🔑 Chiave distinta per lo store 2
const LS_KEY = "spediamo-pro-spedizioni-2";

export default function Page() {
  const router = useRouter();
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (!usr) router.push("/login");
      setUserChecked(true);
    });
    return () => unsubscribe();
  }, [router]);

  const [orders,          setOrders]          = useState([]);
  const [orderQuery,      setOrderQuery]       = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [form, setForm] = useState({
    nome: "", telefono: "", email: "",
    indirizzo: "", indirizzo2: "",
    capDestinatario: "", cittaDestinatario: "",
    provinciaDestinatario: "", nazioneDestinatario: "",
    altezza: "10", larghezza: "15", profondita: "20", peso: "1",
  });
  const [spedizioni,       setSpedizioni]       = useState([]);
  const [spedizioniCreate, setSpedizioniCreate] = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [errore,           setErrore]           = useState(null);
  const [dateFrom,         setDateFrom]         = useState("2025-01-01");
  const [dateTo,           setDateTo]           = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    try {
      const salvate = localStorage.getItem(LS_KEY);
      if (salvate) setSpedizioniCreate(JSON.parse(salvate));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(spedizioniCreate));
  }, [spedizioniCreate]);

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

  const handleLoadOrders = async () => {
    setLoading(true);
    setErrore(null);
    setOrders([]);
    setSelectedOrderId(null);
    setForm({ nome: "", telefono: "", email: "", indirizzo: "", indirizzo2: "", capDestinatario: "", cittaDestinatario: "", provinciaDestinatario: "", nazioneDestinatario: "", altezza: "10", larghezza: "15", profondita: "20", peso: "1" });
    setSpedizioni([]);
    try {
      if (!dateFrom || !dateTo) throw new Error("Specificare sia la data di inizio che di fine.");
      if (dateFrom > dateTo) throw new Error("La data di inizio non può essere dopo la data di fine.");
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

  const handleSearchOrder = (e) => {
    e.preventDefault();
    setErrore(null);
    setSpedizioni([]);
    const term  = orderQuery.trim().toLowerCase();
    const found = orders.find((o) => {
      const plainName = (o.name || "").toLowerCase().replace(/#/g, "");
      const num       = o.order_number?.toString() || "";
      const idStr     = o.id?.toString() || "";
      return plainName.includes(term) || num.includes(term) || idStr === term;
    });
    if (!found) { setErrore(`Nessun ordine trovato per "${orderQuery}".`); return; }
    setSelectedOrderId(found.id);
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
      provinciaDestinatario: ship.country_code === "IT" ? ship.province_code || "" : ship.provincia || ship.province_code || "",
      nazioneDestinatario:   ship.country_code || "",
    }));
  };

  const handleSimula = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrore(null);
    setSpedizioni([]);
    if (!selectedOrderId) { setErrore("Devi prima selezionare un ordine valido."); setLoading(false); return; }
    try {
      const res = await fetch("/api/spediamo?step=simula", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capDestinatario:       form.capDestinatario,
          cittaDestinatario:     form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          nazioneDestinatario:   form.nazioneDestinatario,
          altezza:               form.altezza,
          larghezza:             form.larghezza,
          profondita:            form.profondita,
          peso:                  form.peso,
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

  const handleCreaECompletaEPaga = async (idSim) => {
    setLoading(true);
    setErrore(null);
    try {
      // Create su spediamo2 (legge indirizzo dallo store 2)
      const resC = await fetch(`/api/spediamo2?step=create&id=${idSim}&shopifyOrderId=${selectedOrderId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ consigneePickupPointId: null }),
      });
      if (!resC.ok) throw await resC.json();
      const { spedizione } = await resC.json();

      // Update su spediamo2 con nuovo mittente + labelFormat ZPL
      const resU = await fetch(`/api/spediamo2?step=update&id=${spedizione.id}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:                  form.nome,
          telefono:              form.telefono,
          email:                 form.email,
          indirizzo:             form.indirizzo,
          indirizzo2:            form.indirizzo2,
          capDestinatario:       form.capDestinatario,
          cittaDestinatario:     form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          noteDestinatario:      "",
          consigneePickupPointId: null,
          labelFormat:           2,  // ✅ ZPL
        }),
      });
      if (!resU.ok) throw await resU.json();
      const dataUpd = await resU.json();

      // Pay
      const resP = await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: "POST" });
      let dataP;
      try { dataP = await resP.json(); } catch { dataP = {}; }
      if (!resP.ok) throw dataP;

      // Details
      const resDetails = await fetch(`/api/spediamo?step=details&id=${spedizione.id}`, { method: "POST" });
      let details = {};
      if (resDetails.ok) details = await resDetails.json();

      const motivo = dataP.message || dataP.error || (typeof dataP === "string" ? dataP : "") || JSON.stringify(dataP, null, 2);
      setSpedizioniCreate((prev) => [
        {
          shopifyOrder: orders.find((o) => o.id === Number(selectedOrderId)),
          spedizione:   { ...dataUpd.spedizione, ...details.spedizione },
          lastPayReason: !dataP.can_pay ? motivo : "",
          fulfilled:    false,
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

  // ✅ FIX: rimosso await dentro arrow function non-async + carrierName corretto per SDA
  const handleEvadiSpedizione = async (spedizioneObj) => {
    setLoading(true);
    setErrore(null);
    try {
      const orderName  = spedizioneObj.shopifyOrder?.name || "";
      const foundOrder = orders.find((o) => {
        const plainName = (o.name || "").toLowerCase().replace(/#/g, "");
        return plainName === orderName.toLowerCase().replace(/#/g, "");
      });
      if (!foundOrder) throw new Error(`Impossibile trovare l'ordine ${orderName}`);

      const corriere = (spedizioneObj.spedizione.corriere || "").toLowerCase();
      const res = await fetch("/api/shopify2/fulfill-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:        foundOrder.id,
          trackingNumber: getTrackingLabel(spedizioneObj.spedizione),
          // ✅ Per SDA/Poste usa "Poste Italiane" così Shopify riconosce il corriere
          carrierName:    corriere.includes("sda") || corriere.includes("poste")
            ? "Poste Italiane"
            : spedizioneObj.spedizione.corriere || "Altro",
        }),
      });

      // ✅ FIX: if/else invece di ternario con await inline
      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
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
  };

  const handlePrintLdv = async (idSpedizione) => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/spediamo?step=ldv&id=${idSpedizione}`, { method: "POST" });
      if (!res.ok) throw await res.json();
      const { ldv }   = await res.json();
      const byteChars = atob(ldv.b64);
      const bytes     = Uint8Array.from(byteChars, (c) => c.charCodeAt(0));
      const blob      = new Blob([bytes], { type: ldv.type });
      const url       = URL.createObjectURL(blob);
      const a         = document.createElement("a");
      a.href          = url;
      a.download      = `ldv_${idSpedizione}.zip`;
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

  const handleCancellaCache = () => {
    if (window.confirm("Vuoi davvero cancellare tutte le spedizioni salvate?")) {
      setSpedizioniCreate([]);
      localStorage.removeItem(LS_KEY);
    }
  };

  if (!userChecked) {
    return <div style={{ padding: 40, textAlign: "center" }}>Caricamento...</div>;
  }

  // Il resto del JSX (render) rimane identico al tuo originale —
  // nessuna modifica alla UI, solo le funzioni sopra sono state fixate.
  // Incolla qui il tuo blocco return esistente invariato.
  return (
    // ... il tuo JSX originale invariato ...
    <div>TODO: incolla qui il tuo return JSX originale</div>
  );
}
