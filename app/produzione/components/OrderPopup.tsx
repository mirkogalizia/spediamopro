'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getCorriereIcon, getTrackingLabel, removeAccents } from './utils';

interface OrderPopupProps {
  orderName: string;
  onClose: () => void;
  onEvadi: () => void;
}

export default function OrderPopup({ orderName, onClose, onEvadi }: OrderPopupProps) {
  const [order, setOrder] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [spedizioni, setSpedizioni] = useState<any[]>([]);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/shopify?name=${orderName}`);
        const data = await res.json();
        const ord = data.order;
        setOrder(ord);
        const ship = ord.shipping_address || {};
        setForm({
          nome: `${ship.first_name || ''} ${ship.last_name || ''}`.trim(),
          telefono: ship.phone || '',
          email: ord.email || '',
          indirizzo: removeAccents(ship.address1 || ''),
          indirizzo2: removeAccents(ship.address2 || ''),
          capDestinatario: ship.zip || '',
          cittaDestinatario: removeAccents(ship.city || ''),
          provinciaDestinatario: ship.province_code || '',
          nazioneDestinatario: ship.country_code || '',
          altezza: '10',
          larghezza: '15',
          profondita: '20',
          peso: '1',
        });
      } catch (err) {
        setErrore('Errore caricamento ordine');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderName]);

  const handleSimula = async () => {
    setLoading(true);
    setSpedizioni([]);
    try {
      const res = await fetch('/api/spediamo?step=simula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      setSpedizioni(data.simulazione?.spedizioni || []);
    } catch {
      setErrore('Errore simulazione spedizione');
    } finally {
      setLoading(false);
    }
  };

  const handleCreaEPaga = async (idSim: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spediamo?step=create&id=${idSim}&shopifyOrderId=${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consigneePickupPointId: null }),
      });
      const { spedizione } = await res.json();
      await fetch(`/api/spediamo?step=update&id=${spedizione.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: 'POST' });
      alert('✅ Spedizione creata!');
    } catch {
      alert('Errore creazione spedizione');
    } finally {
      setLoading(false);
    }
  };

  const handleEvadi = async () => {
    onEvadi();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0006', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: 16 }}>🚚 Spedizione ordine {orderName}</h2>
        {errore && <div style={{ color: 'red', marginBottom: 12 }}>{errore}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder='Nome' value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input placeholder='Telefono' value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <input placeholder='Email' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder='Indirizzo' value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} />
          <input placeholder='Indirizzo 2' value={form.indirizzo2} onChange={(e) => setForm({ ...form, indirizzo2: e.target.value })} />
          <input placeholder='CAP' value={form.capDestinatario} onChange={(e) => setForm({ ...form, capDestinatario: e.target.value })} />
          <input placeholder='Città' value={form.cittaDestinatario} onChange={(e) => setForm({ ...form, cittaDestinatario: e.target.value })} />
          <input placeholder='Provincia' value={form.provinciaDestinatario} onChange={(e) => setForm({ ...form, provinciaDestinatario: e.target.value })} />
          <input placeholder='Nazione' value={form.nazioneDestinatario} readOnly />
        </div>

        <button onClick={handleSimula} disabled={loading} style={{ marginTop: 16, padding: 10 }}>Simula Spedizione</button>

        {spedizioni.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {spedizioni.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottom: '1px solid #ccc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getCorriereIcon(s.corriere)}
                  <strong>{s.corriere}</strong> · <span>{parseFloat(s.tariffa).toFixed(2)} €</span>
                </div>
                <button onClick={() => handleCreaEPaga(s.id)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6 }}>Crea & Paga</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={handleEvadi} style={{ background: '#007aff', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none' }}>Evadi ordine</button>
          <button onClick={onClose} style={{ background: '#ccc', padding: '10px 20px', borderRadius: 8, border: 'none' }}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}