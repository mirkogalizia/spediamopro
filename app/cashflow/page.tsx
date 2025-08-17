'use client';

import { useEffect, useState } from 'react';

interface Payout {
  id: string;
  date: string;
  currency: string;
  status: string;
  amount: string;
}

interface DayData {
  date: string;
  incasso: number;
}

export default function CashFlowPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [giorni, setGiorni] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const from = `${yyyy}-08-01`;
    const to = `${yyyy}-${mm}-${dd}`;

    // Ordini giornalieri
    fetch(`/api/shopify/orders-by-day?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setGiorni(data.days);
      })
      .catch(err => console.error("Errore fetch incassi:", err));

    // Payout
    fetch('/api/shopify/payouts')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setPayouts(data.payouts);
      })
      .catch(err => console.error("Errore fetch payouts:", err))
      .finally(() => setLoading(false));
  }, []);

  // Unione dei dati per data
  const giorniUnificati = giorni.map(g => {
    const payout = payouts.find(p => p.date.slice(0, 10) === g.date);
    const payoutAmount = payout ? parseFloat(payout.amount) : 0;
    return {
      data: g.date,
      incasso: g.incasso,
      payout: payoutAmount,
      differenza: g.incasso - payoutAmount,
    };
  });

  return (
    <div style={{ padding: '48px', fontFamily: 'Inter, sans-serif', background: '#f9f9f9' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>📊 Cash Flow Giornaliero</h1>

      {loading && <p>Caricamento dati...</p>}

      {!loading && (
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: '#eee' }}>
            <tr>
              <th style={{ padding: '12px' }}>Data</th>
              <th style={{ padding: '12px' }}>Incasso Giorno</th>
              <th style={{ padding: '12px' }}>Payout Ricevuto</th>
              <th style={{ padding: '12px' }}>Differenza</th>
            </tr>
          </thead>
          <tbody>
            {giorniUnificati.map((row) => (
              <tr key={row.data} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px' }}>{new Date(row.data).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{row.incasso.toFixed(2)} €</td>
                <td style={{ padding: '12px' }}>{row.payout.toFixed(2)} €</td>
                <td style={{ padding: '12px', color: row.differenza >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                  {row.differenza.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}