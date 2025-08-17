// pages/analisi.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DayData {
  date: string;
  incasso: number;
  spedizione: number;
  tshirt: number;
  felpe: number;
  costo_merce: number;
  margine_netto: number;
}

export default function AnalisiPage() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const from = `${yyyy}-08-01`; // partenza da agosto per ora
    const to = `${yyyy}-${mm}-${dd}`;

    fetch(`/api/shopify/orders-by-day?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(json => {
        if (json.ok) setData(json.days);
      })
      .catch(err => console.error('Errore fetch:', err))
      .finally(() => setLoading(false));
  }, []);

  const totaleIncasso = data.reduce((acc, d) => acc + d.incasso, 0);
  const totaleSpedizione = data.reduce((acc, d) => acc + d.spedizione, 0);
  const totaleMerce = data.reduce((acc, d) => acc + d.costo_merce, 0);
  const totaleMargine = data.reduce((acc, d) => acc + d.margine_netto, 0);

  return (
    <div style={{ padding: '48px', fontFamily: 'Inter, sans-serif', background: '#f9f9f9' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>📈 Analisi Business</h1>

      {loading && <p>Caricamento dati...</p>}

      {!loading && (
        <>
          <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', fontSize: '18px', fontWeight: 500 }}>
            <div>
              Incasso Totale: <span style={{ fontWeight: 700, color: '#2ecc71' }}>{totaleIncasso.toFixed(2)} €</span>
            </div>
            <div>
              Spedizione Totale: <span style={{ fontWeight: 700 }}>{totaleSpedizione.toFixed(2)} €</span>
            </div>
            <div>
              Costo Merce: <span style={{ fontWeight: 700 }}>{totaleMerce.toFixed(2)} €</span>
            </div>
            <div>
              Margine Netto: <span style={{ fontWeight: 700, color: totaleMargine >= 0 ? '#2ecc71' : '#e74c3c' }}>{totaleMargine.toFixed(2)} €</span>
            </div>
          </div>

          <div style={{ marginBottom: '48px', background: 'white', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>📉 Andamento Margine Netto</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                <YAxis />
                <Tooltip formatter={(value) => `${parseFloat(value as string).toFixed(2)} €`} />
                <Line type="monotone" dataKey="margine_netto" stroke="#2ecc71" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
            <thead style={{ background: '#eee' }}>
              <tr>
                <th style={{ padding: '12px' }}>Data</th>
                <th style={{ padding: '12px' }}>Incasso</th>
                <th style={{ padding: '12px' }}>Spedizione</th>
                <th style={{ padding: '12px' }}>T-shirt</th>
                <th style={{ padding: '12px' }}>Felpe</th>
                <th style={{ padding: '12px' }}>Costo merce</th>
                <th style={{ padding: '12px' }}>Margine netto</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr key={day.date} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>{new Date(day.date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>{day.incasso.toFixed(2)} €</td>
                  <td style={{ padding: '12px' }}>{day.spedizione.toFixed(2)} €</td>
                  <td style={{ padding: '12px' }}>{day.tshirt}</td>
                  <td style={{ padding: '12px' }}>{day.felpe}</td>
                  <td style={{ padding: '12px' }}>{day.costo_merce.toFixed(2)} €</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: day.margine_netto >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    {day.margine_netto.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}