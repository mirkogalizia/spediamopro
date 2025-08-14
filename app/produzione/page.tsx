'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface RigaProduzione {
  tipo_prodotto: string
  taglia: string
  colore: string
  grafica: string
  immagine: string | null
  order_name: string
  created_at: string
  variant_id: number
  variant_title: string
}

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

  return (
    <div style={{ padding: '64px 32px', display: 'flex', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f5f5f7' }}>
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '24px' }}>📦 Produzione</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            onClick={fetchProduzione}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Carica ordini
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#888' }}>Caricamento in corso...</p>
        ) : (
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', fontSize: '15px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f7' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left' }}>✓</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Ordine</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Tipo</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Colore</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Taglia</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Grafica</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((riga) => (
                  <tr key={riga.variant_id + '-' + riga.order_name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '16px' }}>
                      <input
                        type="checkbox"
                        checked={!!stampati[riga.variant_id]}
                        onChange={() => toggleStampato(riga.variant_id)}
                        style={{ transform: 'scale(1.4)' }}
                      />
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace' }}>{riga.order_name}</td>
                    <td style={{ padding: '16px' }}>{riga.tipo_prodotto}</td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>{riga.colore}</td>
                    <td style={{ padding: '16px', textTransform: 'uppercase' }}>{riga.taglia}</td>
                    <td style={{ padding: '16px', color: '#666' }}>{riga.grafica}</td>
                    <td style={{ padding: '16px' }}>
                      {riga.immagine ? (
                        <div style={{ width: '60px', height: '60px', position: 'relative' }}>
                          <Image
                            src={riga.immagine}
                            alt={riga.grafica}
                            fill
                            style={{ objectFit: 'contain', borderRadius: '8px', border: '1px solid #ddd' }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#ccc' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
