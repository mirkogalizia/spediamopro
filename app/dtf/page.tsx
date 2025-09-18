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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '16px',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          {graficheRaggruppate.map(([grafica, info]) => (
            <div
              key={grafica}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 0 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  paddingBottom: '100%',
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  marginBottom: '8px',
                }}
              >
                {info.immagine && (
                  <Image
                    src={info.immagine}
                    alt="grafica"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                )}
              </div>

              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#000',
                  background: '#f0f0f0',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                Totale inevasi: {info.totale}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', width: '100%' }}>
                {Array.from(info.totalePerColore.entries()).map(([colore, qty]) => (
                  <li
                    key={colore}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{colore}</span>
                    <span style={{ fontWeight: 700 }}>{qty}×</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}