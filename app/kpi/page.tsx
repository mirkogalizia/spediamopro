'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export default function KpiPage() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKpiData() {
      try {
        const colRef = collection(db, 'spedizioni_kpi');
        const q = query(colRef, orderBy('giorno', 'desc'), limit(30)); // ultimi 30 giorni
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setKpiData(data);
      } catch (err) {
        console.error('Errore caricamento KPI:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchKpiData();
  }, []);

  if (loading) {
    return <div className="p-4">Caricamento KPI...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">📦 KPI Spedizioni</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">Giorno</th>
              <th className="px-4 py-2 border">Numero spedizioni</th>
              <th className="px-4 py-2 border">Totale speso (€)</th>
              <th className="px-4 py-2 border">Media per spedizione (€)</th>
            </tr>
          </thead>
          <tbody>
            {kpiData.map((row) => {
              const media = row.numero_spedizioni
                ? (row.totale_speso / row.numero_spedizioni).toFixed(2)
                : '0.00';
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{row.giorno}</td>
                  <td className="px-4 py-2 border">{row.numero_spedizioni}</td>
                  <td className="px-4 py-2 border">{row.totale_speso.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{media}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}