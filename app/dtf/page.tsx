'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

interface RigaProduzione {
  grafica: string;
  colore: string;
  immagine: string | null;
  immagine_prodotto: string | null;
}

function formatDate(d: Date) {
  // yyyy-mm-dd (per <input type="date">)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DTFPage() {
  const [righe, setRighe] = useState<RigaProduzione[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [from, setFrom] = useState<string>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    return formatDate(from);
  });
  const [to, setTo] = useState<string>(() => formatDate(new Date()));
  const [search, setSearch] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  async function loadProduzione() {
    if (!from || !to) return;
    // cancella eventuale fetch precedente
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const url = `/api/produzione?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${text || 'Errore sconosciuto'}`);
      }

      // Potrebbe arrivare JSON o nulla: gestiamo robusto
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('La risposta non è JSON valido.');
      }

      // Accetta diverse forme: array diretto, {produzione}, {ok, produzione}, {items}
      let rows: any[] | null = null;
      if (Array.isArray(data)) rows = data;
      else if (Array.isArray(data?.produzione)) rows = data.produzione;
      else if (data?.ok && Array.isArray(data?.produzione)) rows = data.produzione;
      else if (Array.isArray(data?.items)) rows = data.items;

      if (!rows) {
        console.warn('Forma risposta inattesa:', data);
        setRighe([]);
        setError('La risposta API non contiene dati attesi (chiave "produzione" o array).');
        return;
      }

      setRighe(rows as RigaProduzione[]);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // ignoriamo fetch annullata
      console.error('Errore nel fetch /api/produzione:', e);
      setError(e?.message || 'Errore nel caricamento dei dati.');
      setRighe([]);
    } finally {
      setLoading(false);
    }
  }

  // Carica una volta all’inizio con le date di default
  useEffect(() => {
    loadProduzione();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const grafica = riga.grafica?.trim() || 'Senza nome';
      const colore = (riga.colore || '').toUpperCase();
      const immagine = riga.immagine || riga.immagine_prodotto || '';

      if (!map.has(grafica)) {
        const m = new Map<string, number>();
        if (colore) m.set(colore, 1);
        map.set(grafica, { totalePerColore: m, immagine, totale: 1 });
      } else {
        const entry = map.get(grafica)!;
        if (colore) {
          entry.totalePerColore.set(colore, (entry.totalePerColore.get(colore) || 0) + 1);
        }
        entry.totale += 1;
      }
    }

    return Array.from(map.entries())
      .filter(([grafica]) => grafica.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b[1].totale - a[1].totale);
  }, [righe, search]);

  return (
    <div style={{ padding: '48px 24px', fontFamily: 'Inter, sans-serif', background: '#f5f5f7', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Da:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <label>A:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button
            onClick={loadProduzione}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
            disabled={loading}
          >
            {loading ? 'Carico…' : 'Carica'}
          </button>
          <input
            type="text"
            placeholder="🔍 Cerca grafica…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: 16, flexGrow: 1 }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 16, color: '#b00020', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {!loading && !error && graficheRaggruppate.length === 0 && (
          <div style={{ marginTop: 24, color: '#555' }}>
            Nessun risultato per l’intervallo selezionato.
          </div>
        )}

        {loading && <p>Caricamento in corso…</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '16px',
            width: '100%',
            maxWidth: '100%',
            opacity: loading ? 0.6 : 1,
            pointerEvents: loading ? 'none' : 'auto'
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
              title={grafica}
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
                  background: '#fafafa'
                }}
              >
                {info.immagine ? (
                  <Image
                    src={info.immagine}
                    alt={grafica}
                    fill
                    sizes="(max-width: 1600px) 160px, 200px"
                    style={{ objectFit: 'contain' }}
                    // Nota: assicurati che il dominio delle immagini sia in next.config.js -> images.domains
                    // altrimenti Next/Image blocca il render e sembra "non caricare"
                    onError={(e) => {
                      // fallback visivo se l'immagine fallisce
                      (e.target as any).style.display = 'none';
                    }}
                  />
                ) : null}
              </div>

              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: '6px',
                  color: '#000',
                  background: '#f0f0f0',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {grafica}
              </div>

              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#000',
                  background: '#e8f0ff',
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