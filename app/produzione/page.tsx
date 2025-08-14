'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'

interface RigaProduzione {
  tipo_prodotto: string
  taglia: string
  colore: string
  grafica: string
  immagine: string | null
  immagine_prodotto: string | null
  order_name: string
  created_at: string
  variant_id: number
  variant_title: string
}

const COLORI_MAP: { [nome: string]: string } = {
  "BIANCO": "#f7f7f7",
  "NERO": "#050402",
  "VIOLA": "#663399",
  "TABACCO": "#663333",
  "ROYAL": "#0066CC",
  "VERDE BOSCO": "#336633",
  "ROSSO": "#993333",
  "PANNA": "#F3F1E9",
  "BLACK": "#050402",
  "TURTLE": "#999999",
  "FUME'": "#999999",
  "SKY": "#87CEEB",
  "CAMMELLO": "#E4CFB1",
  "VERDE": "#336633",
  "NAVY": "#000080",
  "CREMA": "#fffdd0",
  "PIOMBO": "#293133",
  "CIOCCOLATO": "#695046",
  "SABBIA": "#d4c3a1",
  "ARMY": "#454B1B",
  "DARK GREY": "#636363",
  "SAND": "#C2B280",
  "SPORT GREY": "#CBCBCB",
  "BORDEAUX": "#784242",
  "NIGHT BLUE": "#040348",
  "DARK CHOCOLATE": "#4b3f37",
};

export default function ProduzionePage() {
  const [righe, setRighe] = useState<RigaProduzione[]>([])
  const [stampati, setStampati] = useState<{ [key: number]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const fetchProduzione = async () => {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/produzione?from=${from}&to=${to}`)
      const data = await res.json()
      if (data.ok) {
        setRighe(data.produzione)
        const saved = localStorage.getItem('stampati')
        if (saved) setStampati(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Errore fetch produzione:', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleStampato = (variant_id: number) => {
    const updated = { ...stampati, [variant_id]: !stampati[variant_id] }
    setStampati(updated)
    localStorage.setItem('stampati', JSON.stringify(updated))
  }

  const renderColorePallino = (nome: string) => {
    const colore = COLORI_MAP[nome.toUpperCase()] || '#999';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: colore,
          border: '1px solid #ccc'
        }}></span>
        <strong style={{ fontSize: '18px' }}>{nome}</strong>
      </div>
    );
  }

  const isStartOfOrderGroup = (index: number) => {
    return index === 0 || righe[index].order_name !== righe[index - 1].order_name;
  }

  const totaliMagazzino = useMemo(() => {
    const map = new Map<string, number>();
    for (const riga of righe) {
      const key = `${riga.tipo_prodotto} | ${riga.colore.toUpperCase()} | ${riga.taglia.toUpperCase()}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [righe]);

  return (
    <div style={{ padding: '64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f5f5f7' }}>
      <div style={{ width: '100%', maxWidth: '1400px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '24px' }}>📦 Produzione</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            onClick={fetchProduzione}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            Carica ordini
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#888' }}>Caricamento in corso...</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', fontSize: '18px', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f5f5f7' }}>
                  <tr>
                    <th style={{ padding: '20px', textAlign: 'left' }}>Ordine</th>
                    <th style={{ padding: '20px', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '20px', textAlign: 'left' }}>Colore</th>
                    <th style={{ padding: '20px', textAlign: 'left' }}>Taglia</th>
                    <th style={{ padding: '20px', textAlign: 'left' }}>Preview</th>
                    <th style={{ padding: '20px', textAlign: 'right' }}>Stampato</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((riga, index) => (
                    <tr
                      key={riga.variant_id + '-' + riga.order_name}
                      style={{
                        borderBottom: '1px solid #eee',
                        borderLeft: isStartOfOrderGroup(index) ? '4px solid #007aff' : '4px solid transparent'
                      }}
                    >
                      <td style={{ padding: '20px', fontFamily: 'monospace', fontWeight: 'bold' }}>{riga.order_name}</td>
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

            <div style={{ marginTop: '32px', background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>📦 Totale da prelevare a magazzino:</h2>
              <ul style={{ columns: 2, fontSize: '16px', lineHeight: '1.8' }}>
                {totaliMagazzino.map(([chiave, quantita]) => (
                  <li key={chiave}><strong>{quantita}×</strong> {chiave}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

