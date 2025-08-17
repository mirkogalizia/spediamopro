'use client';

import { useEffect, useState } from 'react';

interface Payout {
  id: string;
  date: string;
  currency: string;
  status: string;
  summary: {
    adjustments_fee_amount: string;
    charges_fee_amount: string;
    refunds_fee_amount: string;
  };
  amount: string;
}

interface FacebookData {
  spendToday: string;
  amountSpent: string;
  spendCap: string;
  remaining: string;
}

export default function CashFlowPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [facebookData, setFacebookData] = useState<FacebookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Shopify Payouts
    fetch('/api/shopify/payouts')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setPayouts(data.payouts);
      })
      .catch(err => console.error("Errore fetch payouts:", err));

    // Facebook Ads Data
    fetch('/api/facebook/ads-info')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setFacebookData(data);
      })
      .catch(err => console.error("Errore fetch Facebook Ads:", err))
      .finally(() => setLoading(false));
  }, []);

  const totale = payouts.reduce((acc, p) => acc + parseFloat(p.amount), 0);

  return (
    <div style={{ padding: '48px', fontFamily: 'Inter, sans-serif', background: '#f5f5f7', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>Cash Flow 💰</h1>

      {loading && <p>Caricamento...</p>}

      <div style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500' }}>
        Totale ricevuto da Shopify: <span style={{ fontWeight: '700' }}>{totale.toFixed(2)} €</span>
      </div>

      {facebookData && (
        <div style={{ marginBottom: '32px', fontSize: '18px', fontWeight: '500', lineHeight: '1.6' }}>
          <div>
            Spesa Facebook Ads <strong>oggi</strong>: <span style={{ color: '#c0392b', fontWeight: '700' }}>{parseFloat(facebookData.spendToday).toFixed(2)} €</span>
          </div>
          <div>
            Spesa <strong>totale</strong>: {parseFloat(facebookData.amountSpent).toFixed(2)} €
          </div>
          <div>
            Budget massimo (spend_cap): {parseFloat(facebookData.spendCap).toFixed(2)} €
          </div>
          <div>
            Budget residuo: <strong>{parseFloat(facebookData.remaining).toFixed(2)} €</strong>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Data</th>
            <th style={{ padding: '12px' }}>Importo</th>
            <th style={{ padding: '12px' }}>Valuta</th>
            <th style={{ padding: '12px' }}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '12px' }}>{new Date(payout.date).toLocaleDateString()}</td>
              <td style={{ padding: '12px', fontWeight: 600 }}>{parseFloat(payout.amount).toFixed(2)}</td>
              <td style={{ padding: '12px' }}>{payout.currency}</td>
              <td style={{ padding: '12px' }}>{payout.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}