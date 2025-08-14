'use client'

import { useState } from 'react'
import { Button } from '@mui/material'

export default function ProduzionePage() {
  const [orders, setOrders] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    if (!from || !to) return alert('Seleziona entrambe le date')
    setLoading(true)
    const res = await fetch(`/api/shopify/orders?from=${from}&to=${to}`)
    const json = await res.json()
    if (json.ok) setOrders(json.orders)
    else alert('Errore caricamento ordini')
    setLoading(false)
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>Produzione</h1>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="contained" onClick={fetchOrders} disabled={loading}>
          {loading ? 'Caricamento...' : 'Carica Ordini'}
        </Button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
        <thead style={{ background: '#f1f1f1' }}>
          <tr>
            <th style={th}>Ordine</th>
            <th style={th}>Prodotto</th>
            <th style={th}>Taglia</th>
            <th style={th}>Colore</th>
            <th style={th}>Preview</th>
            <th style={th}>Stampato</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) =>
            order.line_items.map((item, idx) => (
              <tr key={order.id + '-' + idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{order.name}</td>
                <td style={td}>{item.title}</td>
                <td style={td}>{item.variant_title?.split(' / ')[0] || '-'}</td>
                <td style={td}>{item.variant_title?.split(' / ')[1] || '-'}</td>
                <td style={td}>
                  {item.image?.src ? (
                    <img src={item.image.src} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    '—'
                  )}
                </td>
                <td style={td}><input type="checkbox" /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = {
  textAlign: 'left',
  padding: '12px',
  fontWeight: 'bold',
  fontSize: '14px',
  background: '#fafafa',
}

const td = {
  padding: '12px',
  fontSize: '14px',
}
