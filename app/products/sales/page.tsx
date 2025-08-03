'use client';

import React, { useEffect, useState } from 'react';

type VariantData = {
  variante: string | null | undefined;
  venduto: number;
  stock: number;
};

type TypeGroup = {
  tipologia: string;
  variants: VariantData[];
};

function normalize(str: string | null | undefined) {
  if (!str) return "";
  return str.trim().toLowerCase();
}

export default function StockForecastByColorAndSize() {
  const [data, setData] = useState<TypeGroup[]>([]);
  const [error, setError] = useState('');
  const [stockInput, setStockInput] = useState<Record<string, number>>({});

  const periodDays = 30; // venduto ultimi 30 giorni

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/products/sales');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json: TypeGroup[] = await res.json();
        setData(json);

        // Inizializza stockInput con stock da backend
        const initialStock: Record<string, number> = {};
        json.forEach(group => {
          group.variants.forEach(v => {
            const [taglia, colore] = (v.variante ?? "").split("/").map(s => normalize(s));
            const key = `${normalize(group.tipologia)}|${colore}|${taglia}`;
            initialStock[key] = v.stock || 0;
          });
        });
        setStockInput(initialStock);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchData();
  }, []);

  function groupVariants(variants: VariantData[]) {
    const grouped: Record<string, Record<string, VariantData[]>> = {};
    variants.forEach(v => {
      const [tagliaRaw, coloreRaw] = (v.variante ?? "").split("/").map(s => s.trim());
      const taglia = tagliaRaw || "Sconosciuta";
      const colore = coloreRaw || "Sconosciuto";
      if (!grouped[colore]) grouped[colore] = {};
      if (!grouped[colore][taglia]) grouped[colore][taglia] = [];
      grouped[colore][taglia].push(v);
    });
    return grouped;
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-10 font-sans text-[#1d1d1f] max-w-7xl mx-auto">
      <h1 className="text-5xl font-semibold mb-12">Previsionale Magazzino Blanks per Colore e Taglia</h1>

      {error && (
        <div className="mb-8 p-4 bg-[#ffecec] text-[#d93025] rounded-lg font-semibold">
          Errore: {error}
        </div>
      )}

      {data.length === 0 && !error && (
        <p className="text-[#6e6e73] text-lg">Caricamento dati in corso…</p>
      )}

      {data.map(group => (
        <section key={group.tipologia} className="mb-16 bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-3xl font-medium mb-8 capitalize">{group.tipologia}</h2>

          {Object.entries(groupVariants(group.variants)).map(([colore, taglieObj]) => (
            <div key={colore} className="mb-10">
              <h3 className="text-2xl font-semibold mb-4 capitalize">{colore}</h3>

              <table className="w-full border-collapse rounded-2xl overflow-hidden">
                <thead className="bg-[#f0f0f5] text-[#6e6e73] text-left select-none">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Taglia</th>
                    <th className="py-4 px-6 font-semibold text-center">Venduto (ultimi {periodDays} gg)</th>
                    <th className="py-4 px-6 font-semibold text-center">Stock attuale</th>
                    <th className="py-4 px-6 font-semibold text-center">Giorni stimati rimanenti</th>
                    <th className="py-4 px-6 font-semibold text-center">Suggerimento acquisto (per 30 gg)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const taglieOrdinate = ['xs', 's', 'm', 'l', 'xl'];
                    return Object.entries(taglieObj)
                      .sort(([tagliaA], [tagliaB]) => {
                        const iA = taglieOrdinate.indexOf(tagliaA.toLowerCase());
                        const iB = taglieOrdinate.indexOf(tagliaB.toLowerCase());
                        if (iA === -1 && iB === -1) return tagliaA.localeCompare(tagliaB);
                        if (iA === -1) return 1;
                        if (iB === -1) return -1;
                        return iA - iB;
                      })
                      .map(([taglia, vars]) => {
                        const v = vars[0];
                        const key = `${normalize(group.tipologia)}|${normalize(colore)}|${normalize(taglia)}`;
                        const stock = stockInput[key] ?? 0;
                        const dailyConsumption = v.venduto / periodDays;
                        const daysRemaining =
                          dailyConsumption > 0 ? Math.floor(stock / dailyConsumption) : '∞';
                        const purchaseSuggestion =
                          dailyConsumption > 0
                            ? Math.max(0, Math.ceil(dailyConsumption * 30 - stock))
                            : 0;

                        return (
                          <tr
                            key={taglia}
                            className={`bg-white border-b border-gray-200 ${
                              typeof daysRemaining === 'number' && daysRemaining <= 7
                                ? 'bg-[#ffeaea]'
                                : ''
                            }`}
                          >
                            <td className="py-4 px-6 text-lg font-medium capitalize">{taglia}</td>
                            <td className="py-4 px-6 text-center text-lg">{v.venduto}</td>
                            <td className="py-4 px-6 text-center font-semibold">{stock}</td>
                            <td
                              className={`py-4 px-6 text-center text-lg font-semibold ${
                                typeof daysRemaining === 'number' && daysRemaining <= 7
                                  ? 'text-[#d93025]'
                                  : 'text-[#1d1d1f]'
                              }`}
                            >
                              {daysRemaining}
                            </td>
                            <td className="py-4 px-6 text-center font-semibold text-[#1d1d1f]">
                              {purchaseSuggestion}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}