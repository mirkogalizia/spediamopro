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
        immagine: string;
      }
    >();

    for (const riga of righe) {
      const grafica = riga.grafica;
      const colore = riga.colore.toUpperCase();
      const key = grafica;

      if (!map.has(key)) {
        const immagine = riga.immagine || riga.immagine_prodotto || '';
        map.set(key, { totalePerColore: new Map([[colore, 1]]), immagine });
      } else {
        const entry = map.get(key)!;
        entry.totalePerColore.set(
          colore,
          (entry.totalePerColore.get(colore) || 0) + 1
        );
      }
    }

    return map;
  }, [righe]);

  return (
    <div style={{ padding: '64px 32px', fontFamily: 'Inter, sans-serif', background: '#f5f5f7', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '24px' }}>🎨 Grafiche da stampare (DTF)</h1>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'center' }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            onClick={() => {}}
            disabled
            style={{ padding: '10px 20px', backgroundColor: '#999', color: '#fff', borderRadius: '8px' }}
          >
            {loading ? 'Caricamento...' : 'Carica automatica'}
          </button>
        </div>

        {Array.from(graficheRaggruppate.entries()).map(([grafica, info]) => (
          <div
            key={grafica}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '32px',
              boxShadow: '0 0 10px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
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
              <h2 style={{ fontSize: '24px', fontWeight: 600 }}>{grafica}</h2>
            </div>

            <ul style={{ paddingLeft: '16px', fontSize: '18px' }}>
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
  );
}