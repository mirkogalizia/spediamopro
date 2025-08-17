'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface RigaProduzione {
  grafica: string; // numero_grafica
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
        if (data.ok) {
          setRighe(data.produzione);
        }
      })
      .catch((err) => {
        console.error("Errore nel fetch:", err);
      })
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
    <div style={{ padding: '64px 32px', fontFamily: 'Inter, sans-serif', background: '#f5f5f7', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '24px' }}>🎨 Grafiche da stampare (DTF)</h1>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <input
            type="text"
            placeholder="Cerca grafica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', flexGrow: 1 }}
          />
        </div>

        {loading && <p>Caricamento in corso...</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {graficheRaggruppate.map(([grafica, info]) => (
            <div
              key={grafica}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 0 10px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '80px', height: '80px', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  {info.immagine && (
                    <Image
                      src={info.immagine}
                      alt={grafica}
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: 4 }}>{grafica}</h2>
                  <div style={{ fontSize: '16px', color: '#555' }}>
                    Totale: <strong>{info.totale}</strong>
                  </div>
                </div>
              </div>

              <ul style={{ paddingLeft: '16px', fontSize: '17px', marginTop: '8px' }}>
                {Array.from(info.totalePerColore.entries()).map(([colore, qty]) => (
                  <li key={colore}>
                    <strong>{colore}</strong> × {qty}
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