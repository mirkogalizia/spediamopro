'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface RigaProduzione {
  grafica: string;
  colore: string;
  immagine: string | null;
  immagine_prodotto: string | null;
}

export default function DTFPage() {
  const [righe, setRighe] = useState<RigaProduzione[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    fetch(`/api/produzione?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setRighe(data.produzione);
      })
      .catch((err) => console.error("Errore nel fetch:", err))
      .finally(() => setLoading(false));
  }, [from, to]);

  const graficheRaggruppate = useMemo(() => {
    const map = new Map<
      string,
      {
        totalePerColore: Map<string, number>;
        totale: number;
        immagine: string;
      }
    >();

    for (const riga of righe) {
      const grafica = riga.grafica;
      const colore = riga.colore.toUpperCase();
      const immagine = riga.immagine || riga.immagine_prodotto || '';

      if (!map.has(grafica)) {
        const m = new Map<string, number>();
        m.set(colore, 1);
        map.set(grafica, { totalePerColore: m, immagine, totale: 1 });
      } else {
        const entry = map.get(grafica)!;
        entry.totalePerColore.set(colore, (entry.totalePerColore.get(colore) || 0) + 1);
        entry.totale += 1;
      }
    }

    return Array.from(map.entries())
      .filter(([grafica]) => grafica.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b[1].totale - a[1].totale); // decrescente
  }, [righe, search]);

  return (
    <div style={{ padding: '48px 24px', fontFamily: 'Inter, sans-serif', background: '#f5f5f7', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <input
            type="text"
            placeholder="🔍 Cerca grafica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, flexGrow: 1 }}
          />
        </div>

        {loading && <p>Caricamento in corso...</p>}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '24px'
        }}>
          {graficheRaggruppate.map(([grafica, info]) => {
            const [stock, setStock] = useState(0);
            const ordini = info.totale;
            const autonomia15gg = Math.ceil(ordini / 30 * 15);
            const totaleDaStampare = Math.max(0, ordini + autonomia15gg - stock);

            return (
              <div
                key={grafica}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: '1px solid #e0e0e0'
                }}
              >
                <div style={{ width: '100%', paddingBottom: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                  {info.immagine && (
                    <Image
                      src={info.immagine}
                      alt="grafica"
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', width: '100%' }}>
                  {Array.from(info.totalePerColore.entries()).map(([colore, qty]) => (
                    <li key={colore} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{colore}</span>
                      <span><strong>{qty}×</strong></span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: 10, fontSize: 14, width: '100%' }}>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    placeholder="Magazzino"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      fontSize: 13,
                      marginBottom: 6
                    }}
                  />
                  <div style={{ fontWeight: 600, textAlign: 'center', background: '#f0f0f0', borderRadius: 6, padding: '4px' }}>
                    Ne devi stampare: {totaleDaStampare}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}