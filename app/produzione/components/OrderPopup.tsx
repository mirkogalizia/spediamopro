'use client'

import React, { useEffect, useState } from 'react';
import { getSpedizione, paySpedizione, printSpedizione, simulaSpedizione, evadiOrdine } from '../../utils';

interface Props {
  orderName: string;
  onClose: () => void;
  onEvadi: () => void;
}

interface Simulazione {
  id: number;
  nome: string;
  costo: string;
}

export default function OrderPopup({ orderName, onClose, onEvadi }: Props) {
  const [indirizzo, setIndirizzo] = useState<string>('');
  const [simulazioni, setSimulazioni] = useState<Simulazione[]>([]);
  const [selectedCorriere, setSelectedCorriere] = useState<number | null>(null);
  const [spedizioneId, setSpedizioneId] = useState<number | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setCaricamento(true);
      try {
        const spedizione = await getSpedizione(orderName);
        setIndirizzo(spedizione.indirizzo);
        const risultati = await simulaSpedizione(orderName);
        setSimulazioni(risultati);
      } catch (e: any) {
        setErrore(e.message || 'Errore durante il caricamento');
      } finally {
        setCaricamento(false);
      }
    }
    load();
  }, [orderName]);

  const handleCreaSpedizione = async () => {
    if (selectedCorriere == null) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const id = await paySpedizione(simulazioni[selectedCorriere].id);
      setSpedizioneId(id);
    } catch (e: any) {
      setErrore(e.message || 'Errore durante il pagamento');
    } finally {
      setCaricamento(false);
    }
  };

  const handleStampa = async () => {
    if (!spedizioneId) return;
    setCaricamento(true);
    try {
      await printSpedizione(spedizioneId);
    } catch (e: any) {
      setErrore(e.message || 'Errore durante la stampa');
    } finally {
      setCaricamento(false);
    }
  };

  const handleEvadi = async () => {
    setCaricamento(true);
    try {
      await evadiOrdine(orderName);
      onEvadi();
    } catch (e: any) {
      setErrore(e.message || 'Errore durante evasione');
    } finally {
      setCaricamento(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', padding: 32, borderRadius: 16, width: '90%', maxWidth: 700, fontFamily: 'Inter, sans-serif' }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>📦 Spedizione ordine <code>{orderName}</code></h2>

        {errore && <p style={{ color: 'red' }}>{errore}</p>}

        {caricamento && <p>Caricamento...</p>}

        {!caricamento && (
          <>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>📍 Indirizzo</h3>
            <pre style={{ background: '#f9f9f9', padding: 12, borderRadius: 8 }}>{indirizzo}</pre>

            <h3 style={{ fontSize: 18, marginTop: 24 }}>🚚 Simulazioni</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {simulazioni.map((sim, i) => (
                <li key={sim.id} style={{ marginBottom: 8 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="corriere"
                      checked={selectedCorriere === i}
                      onChange={() => setSelectedCorriere(i)}
                    />{' '}
                    <strong>{sim.nome}</strong> - {sim.costo}
                  </label>
                </li>
              ))}
            </ul>

            {spedizioneId ? (
              <>
                <button onClick={handleStampa} style={{ padding: '10px 20px', marginRight: 12, background: '#007aff', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Stampa LDV</button>
                <button onClick={handleEvadi} style={{ padding: '10px 20px', background: '#34c759', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Evadi ordine</button>
              </>
            ) : (
              <button
                onClick={handleCreaSpedizione}
                disabled={selectedCorriere == null}
                style={{ padding: '10px 20px', background: selectedCorriere != null ? '#ff9500' : '#ccc', color: 'white', border: 'none', borderRadius: 8, cursor: selectedCorriere != null ? 'pointer' : 'not-allowed' }}
              >
                Crea e paga spedizione
              </button>
            )}

            <button onClick={onClose} style={{ marginTop: 24, display: 'block', background: 'none', color: '#007aff', border: 'none', fontSize: 16, cursor: 'pointer' }}>Chiudi</button>
          </>
        )}
      </div>
    </div>
  );
}