'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function OrderPopup({ orderName, onClose, onEvadi }) {
  const router = useRouter();
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, usr => {
      if (!usr) router.push("/login");
      setUserChecked(true);
    });
    return () => unsub();
  }, [router]);

  function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getCorriereIcon(corriere) {
    const c = (corriere || '').toLowerCase();
    if (c.includes("brt")) return /*...*/;
    if (c.includes("gls")) return /*...*/;
    // replica come nella pagina principale ...
    return (
      <svg width="28" height="18" viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#ccc"/><text x="14" y="13" fill="#333" fontSize="11" fontWeight="bold" textAnchor="middle">Corriere</text></svg>
    );
  }

  function getTrackingLabel(spedizione) {
    if (spedizione.colli?.[0]?.segnacollo) return spedizione.colli[0].segnacollo;
    return spedizione.tracking_number_corriere || spedizione.tracking_number || spedizione.segnacollo || spedizione.codice || "";
  }

  function HoverButton({ style, onClick, children, disabled }) {
    const [hover, setHover] = useState(false);
    return (
      <button
        style={{ ...style, filter: hover ? "brightness(85%)" : "none" }}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {children}
      </button>
    );
  }

  // Stati operativi mimic pagina principale
  const [form, setForm] = useState({ nome: "", telefono: "", email: "", indirizzo: "", indirizzo2: "", capDestinatario: "", cittaDestinatario: "", provinciaDestinatario: "", nazioneDestinatario: "", altezza: "10", larghezza: "15", profondita: "20", peso: "1" });
  const [spedizioni, setSpedizioni] = useState([]);
  const [spedizioniCreate, setSpedizioniCreate] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    const hadir = async () => {
      try {
        const res = await fetch(`/api/shopify?name=${encodeURIComponent(orderName)}`);
        const { orders } = await res.json();
        const ord = orders?.[0];
        const ship = ord?.shipping_address || {};
        setForm(f => ({
          ...f,
          nome: `${ship.first_name || ""} ${ship.last_name || ""}`.trim(),
          telefono: ship.phone || "",
          email: ord.email || "",
          indirizzo: removeAccents(ship.address1 || ""),
          indirizzo2: removeAccents(ship.address2 || ""),
          capDestinatario: ship.zip || "",
          cittaDestinatario: removeAccents(ship.city || ""),
          provinciaDestinatario: ship.country_code==="IT" ? ship.province_code || "" : ship.province || ship.province_code || "",
          nazioneDestinatario: ship.country_code || "",
        }));
      } catch (e) {
        setErrore("Caricamento ordine fallito");
      }
    };
    hadir();
  }, [orderName]);

  const handleSimula = async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch('/api/spediamo?step=simula', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
      const data = await res.json();
      setSpedizioni(data.simulazione?.spedizioni || []);
    } catch (e) {
      setErrore("Errore simulazione");
    } finally {
      setLoading(false);
    }
  };

  const handleCreaECompletaEPaga = async (id) => {
    setLoading(true);
    setErrore(null);
    try {
      // stessa logica: create, update, pay
      await fetch(`/api/spediamo?step=create&id=${id}&shopifyOrderId=${orderName}`, { method: 'POST' });
      await fetch(`/api/spediamo?step=update&id=${id}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
      await fetch(`/api/spediamo?step=pay&id=${id}`, { method: 'POST' });
      alert("Spedizione creata e pagata");
    } catch (e) {
      setErrore("Errore creazione spedizione");
    } finally {
      setLoading(false);
    }
  };

  const handleEvadi = async (s) => {
    setLoading(true);
    setErrore(null);
    try {
      await fetch("/api/shopify/fulfill-order", { method: "POST", headers: {'Content-Type':'application/json'}, body: JSON.stringify({ orderId: orderName, trackingNumber: getTrackingLabel(s.spedizione), carrierName: s.spedizione.corriere }) });
      alert("Ordine evaso correttamente");
      onEvadi();
    } catch (e) {
      setErrore("Errore evasione");
    } finally {
      setLoading(false);
    }
  };

  if (!userChecked) return <div style={{ padding: 40, textAlign: "center" }}>Controllo login…</div>;

  return (
    <div style={{ position:'fixed', inset:0, background:'#0005', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', padding:24, borderRadius:16, width:'90%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', fontFamily:"-apple-system, sans-serif" }}>
        <h2 style={{ marginBottom:16 }}>Evasione ordine {orderName}</h2>
        {errore && <div style={{ color:'red' }}>{errore}</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input placeholder="Destinatario" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
          <input placeholder="Telefono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input placeholder="Indirizzo" value={form.indirizzo} onChange={e => setForm({...form, indirizzo: removeAccents(e.target.value)})} />
          <input placeholder="Indirizzo 2" value={form.indirizzo2} onChange={e => setForm({...form, indirizzo2: removeAccents(e.target.value)})} />
          <input placeholder="CAP" value={form.capDestinatario} onChange={e => setForm({...form, capDestinatario: e.target.value})} />
          <input placeholder="Città" value={form.cittaDestinatario} onChange={e => setForm({...form, cittaDestinatario: e.target.value})} />
          <input placeholder="Provincia" value={form.provinciaDestinatario} onChange={e => setForm({...form, provinciaDestinatario: e.target.value})} />
        </div>
        <button onClick={handleSimula} disabled={loading} style={{ marginTop:16 }}>Simula spedizione</button>
        {spedizioni.map(s => (
          <div key={s.id} style={{ marginTop:12, border:'1px solid #ddd', padding:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {getCorriereIcon(s.corriere)}
              <span>{s.corriere}</span>
              <span>{parseFloat(s.tariffa).toFixed(2)} €</span>
            </div>
            <HoverButton onClick={() => handleCreaECompletaEPaga(s.id)} style={{ background:'#34c759', color:'#fff', padding:'6px 12px', borderRadius:6 }} disabled={loading}>
              Crea & paga
            </HoverButton>
          </div>
        ))}
        {spedizioni.length > 0 && (
          <button onClick={() => handleEvadi({ spedizione: spedizioni[0] })} disabled={loading} style={{ marginTop:16 }}>
            Evadi ordine
          </button>
        )}
        <button onClick={onClose} style={{ marginTop:24, background:'none', color:'#007aff', border:'none', cursor:'pointer' }}>Chiudi</button>
      </div>
    </div>
  );
}