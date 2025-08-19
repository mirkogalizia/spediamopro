"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';

interface RigaProduzione {
  tipo_prodotto: string;
  taglia: string;
  colore: string;
  grafica: string;
  immagine: string | null;
  immagine_prodotto: string | null;
  order_name: string;
  created_at: string;
  variant_id: number;
  variant_title: string;
}

const COLORI_MAP: { [nome: string]: string } = {
  "BIANCO": "#f7f7f7", "NERO": "#050402", "VIOLA": "#663399", "TABACCO": "#663333",
  "ROYAL": "#0066CC", "VERDE BOSCO": "#336633", "ROSSO": "#993333", "PANNA": "#F3F1E9",
  "BLACK": "#050402", "TURTLE": "#999999", "FUME'": "#999999", "SKY": "#87CEEB",
  "CAMMELLO": "#E4CFB1", "VERDE": "#336633", "NAVY": "#000080", "CREMA": "#fffdd0",
  "PIOMBO": "#293133", "CIOCCOLATO": "#695046", "SABBIA": "#d4c3a1", "ARMY": "#454B1B",
  "DARK GREY": "#636363", "SAND": "#C2B280", "SPORT GREY": "#CBCBCB",
  "BORDEAUX": "#784242", "NIGHT BLUE": "#040348", "DARK CHOCOLATE": "#4b3f37",
};

export default function ProduzionePage() {
  const [righe, setRighe] = useState<RigaProduzione[]>([]);
  const [stampati, setStampati] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const normalizzaTipo = (tipo: string) => {
    const t = tipo.toLowerCase().replace(/[-\s]/g, '');
    if (t.includes('tshirt')) return 'Tshirt';
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  };

  const fetchProduzione = async (reset = true) => {
    if (!from || !to) return;
    if (reset) {
      setOffset(0);
      setHasMore(true);
      setRighe([]);
    }
    if (!hasMore && !reset) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/produzione?from=${from}&to=${to}&offset=${reset ? 0 : offset}&limit=100`);
      const data = await res.json();
      if (data.ok) {
        const normalizzate = data.produzione.map((r: RigaProduzione) => ({
          ...r,
          tipo_prodotto: normalizzaTipo(r.tipo_prodotto),
        }));
        setRighe(prev => reset ? normalizzate : [...prev, ...normalizzate]);
        setOffset(prev => prev + 100);
        if (normalizzate.length < 100) setHasMore(false);
        const saved = localStorage.getItem('stampati');
        if (saved) setStampati(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Errore fetch produzione:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: any) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
    if (bottom && !loading && hasMore) {
      fetchProduzione(false);
    }
  };

  useEffect(() => {
    const container = document.getElementById('scroll-container');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [righe, loading, hasMore]);

  const toggleStampato = (variant_id: number) => {
    const updated = { ...stampati, [variant_id]: !stampati[variant_id] };
    setStampati(updated);
    localStorage.setItem('stampati', JSON.stringify(updated));
  };

  const handleMissDTF = (grafica: string, index: number) => {
    const ordineIniziale = righe[index].order_name;
    const ordiniDaEliminare = new Set<string>();
    const visitati = new Set<string>();

    for (let i = index; i < righe.length; i++) {
      const r = righe[i];
      const ordine = r.order_name;
      if (visitati.has(ordine)) continue;
      visitati.add(ordine);

      const contieneGraficaNonStampata = righe.some(
        (rr) => rr.order_name === ordine && rr.grafica === grafica && !stampati[rr.variant_id]
      );

      if (contieneGraficaNonStampata) {
        ordiniDaEliminare.add(ordine);
      }
    }

    const nuovi = righe.filter((r) => !ordiniDaEliminare.has(r.order_name));
    setRighe(nuovi);
  };

  const handleMissBlank = (tipo: string, taglia: string, colore: string, index: number) => {
    const keyRef = `${tipo.toLowerCase()}|||${taglia.toLowerCase()}|||${colore.toLowerCase()}`;
    const ordiniDaEliminare = new Set<string>();
    const visitati = new Set<string>();

    for (let i = index; i < righe.length; i++) {
      const r = righe[i];
      const ordine = r.order_name;
      if (visitati.has(ordine)) continue;
      visitati.add(ordine);

      const contieneMatchNonStampato = righe.some((rr) => {
        const key = `${rr.tipo_prodotto.toLowerCase()}|||${rr.taglia.toLowerCase()}|||${rr.colore.toLowerCase()}`;
        return rr.order_name === ordine && key === keyRef && !stampati[rr.variant_id];
      });

      if (contieneMatchNonStampato) {
        ordiniDaEliminare.add(ordine);
      }
    }

    const nuovi = righe.filter((r) => !ordiniDaEliminare.has(r.order_name));
    setRighe(nuovi);
  };

  const renderColorePallino = (nome: string) => {
    const colore = COLORI_MAP[nome.toUpperCase()] || '#999';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: colore, border: '1px solid #ccc' }}></span>
        <strong style={{ fontSize: '18px' }}>{nome}</strong>
      </div>
    );
  };

  const isStartOfOrderGroup = (index: number) => {
    return index === 0 || righe[index].order_name !== righe[index - 1].order_name;
  };

  const totaliMagazzino = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const riga of righe) {
      const tipo = riga.tipo_prodotto;
      const key = `${riga.colore.toUpperCase()} | ${riga.taglia.toUpperCase()}`;
      if (!map.has(tipo)) map.set(tipo, new Map());
      const inner = map.get(tipo)!;
      inner.set(key, (inner.get(key) || 0) + 1);
    }
    return map;
  }, [righe]);

  return (
    <div id="scroll-container" style={{ height: '100vh', overflowY: 'auto', padding: '64px 32px', fontFamily: 'Inter, sans-serif', background: '#f5f5f7' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '24px' }}>📦 Produzione</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={() => fetchProduzione(true)} style={{ padding: '10px 20px', backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {loading ? 'Caricamento...' : 'Carica ordini'}
          </button>
        </div>

        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px' }}>
          <table style={{ width: '100%', fontSize: '18px', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f5f5f7' }}>
              <tr>
                <th style={{ padding: '20px', textAlign: 'left' }}>Ordine</th>
                <th style={{ padding: '20px' }}>Tipo</th>
                <th style={{ padding: '20px' }}>Colore</th>
                <th style={{ padding: '20px' }}>Taglia</th>
                <th style={{ padding: '20px' }}>Preview</th>
                <th style={{ padding: '20px', textAlign: 'center' }}>❌ DTF</th>
                <th style={{ padding: '20px', textAlign: 'center' }}>❌ Blank</th>
                <th style={{ padding: '20px', textAlign: 'right' }}>Stampato</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((riga, index) => (
                <tr
                  key={riga.variant_id + '-' + riga.order_name}
                  style={{
                    borderBottom: '1px solid #eee',
                    borderLeft: isStartOfOrderGroup(index) ? '4px solid #007aff' : '4px solid transparent',
                    opacity: stampati[riga.variant_id] ? 0.4 : 1,
                  }}
                >
                  <td style={{ padding: '20px' }}>{riga.order_name}</td>
                  <td style={{ padding: '20px' }}>{riga.tipo_prodotto}</td>
                  <td style={{ padding: '20px' }}>{renderColorePallino(riga.colore)}</td>
                  <td style={{ padding: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>{riga.taglia}</td>
                  <td style={{ padding: '20px' }}>
                    <div style={{ width: '100px', height: '100px', position: 'relative' }}>
                      <Image
                        src={riga.immagine && riga.immagine !== '' ? riga.immagine : riga.immagine_prodotto!}
                        alt={riga.grafica}
                        fill
                        style={{ objectFit: 'contain', borderRadius: '8px', border: '1px solid #ddd' }}
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleMissDTF(riga.grafica, index)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleMissBlank(riga.tipo_prodotto, riga.taglia, riga.colore, index)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
                  </td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <input
                      type="checkbox"
                      checked={!!stampati[riga.variant_id]}
                      onChange={() => toggleStampato(riga.variant_id)}
                      style={{ transform: 'scale(1.6)' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div style={{ padding: '20px', fontSize: '18px' }}>⏳ Caricamento dati in corso...</div>}

        <div style={{ marginTop: '32px', background: '#fff', borderRadius: '12px', padding: '24px' }}>
          <h2>📦 Totale da prelevare a magazzino:</h2>
          {Array.from(totaliMagazzino.entries()).map(([tipo, sottoMap]) => (
            <div key={tipo} style={{ marginBottom: '16px' }}>
              <h3>{tipo}</h3>
              <ul style={{ columns: 2, fontSize: '16px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                {Array.from(sottoMap.entries()).map(([chiave, quantita]) => (
                  <li key={chiave}><strong>{quantita}×</strong> {chiave}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
