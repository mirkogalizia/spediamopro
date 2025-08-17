'use client';

import { useEffect, useState } from 'react';

interface Payout {
  id: string;
  date: string;
  currency: string;
  status: string;
  amount: string;
  incasso: number;
}

export default function CashFlowPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [facebookSpend, setFacebookSpend] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Shopify Payouts + Incassi
    fetch('/api/shopify/payouts')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setPayouts(data.payouts);
      })
      .catch(err => console.error("Errore fetch payouts:", err))
      .finally(() => setLoading(false));

    // Facebook Spend
    fetch('/api/facebook/spend')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setFacebookSpend(data.spendToday || '0');
      })
      .catch(err => console.error("Errore fetch Facebook spend:", err));
  }, []);

  const totaleIncasso = payouts.reduce((acc, p) => acc + parseFloat(p.incasso?.toString() || '0'), 0);
  const totaleSpesa = parseFloat(facebookSpend);
  const bilancio = totaleIncasso - totaleSpesa;

  return (
    <div style={{
      padding: '48px',
      fontFamily: 'Inter, sans-serif',
      background: '#f5f5f7',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>
        Cash Flow 💰
      </h1>

      {loading && <p>Caricamento...</p>}

      <div style={{
        display: 'flex',
        gap: '32px',
        marginBottom: '32px',
        fontSize: '18px',
        fontWeight: '500'
      }}>
        <div>
          Incasso Shopify: <span style={{ fontWeight: '700', color: '#2ecc71' }}>
            {totaleIncasso.toFixed(2)} €
          </span>
        </div>
        <div>
          Spesa Facebook: <span style={{ fontWeight: '700', color: '#c0392b' }}>
            {totaleSpesa.toFixed(2)} €
          </span>
        </div>
        <div>
          Bilancio Netto: <span style={{
            fontWeight: '700',
            color: bilancio >= 0 ? '#2ecc71' : '#e74c3c'
          }}>
            {bilancio.toFixed(2)} €
          </span>
        </div>
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Data</th>
            <th style={{ padding: '12px' }}>Incasso del Giorno</th>
            <th style={{ padding: '12px' }}>Payout Giorno</th>
            <th style={{ padding: '12px' }}>Valuta</th>
            <th style={{ padding: '12px' }}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '12px' }}>{new Date(payout.date).toLocaleDateString()}</td>
              <td style={{ padding: '12px', fontWeight: 600 }}>{payout.incasso.toFixed(2)} €</td>
              <td style={{ padding: '12px' }}>{parseFloat(payout.amount).toFixed(2)} €</td>
              <td style={{ padding: '12px' }}>{payout.currency}</td>
              <td style={{ padding: '12px' }}>{payout.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}