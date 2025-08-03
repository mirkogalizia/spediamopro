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
  const [loading, setLoading] = useState(false);

  const periodDays = 30;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/sales');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json: TypeGroup[] = await res.json();
      setData(json);
      setError('');
    } catch (e: any) {
      setError(e.message);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
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
    <main className="min-h-screen bg-gradient-to-tr from-[#f8fafc] via-[#f2f3f7] to-[#ececf0] px-2 py-10 font-sans max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#2b59ff] via-[#00c9a7] to-[#2b59ff] text-transparent bg-clip-text tracking-tight drop-shadow-lg select-none">
          Previsionale Blanks
        </h1>
        <button
          onClick={fetchData}
          className="bg-[#22223b] text-white px-5 py-2 rounded-2xl shadow-lg text-lg font-bold hover:bg-[#3a3a5e] active:scale-95 transition-all"
          disabled={loading}
        >
          {loading ? "Aggiorno..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-[#ffecec] text-[#d93025] rounded-xl font-semibold text-lg shadow">
          Errore: {error}
        </div>
      )}

      {loading && (
        <div className="my-10 flex items-center justify-center gap-3 text-[#888] text-xl">
          <svg className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="#888" strokeWidth="4" />
            <path className="opacity-90" fill="#2b59ff" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Caricamento dati in corso…
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <p className="text-[#6e6e73] text-lg">Nessun dato da visualizzare.</p>
      )}

      <div className="flex flex-col gap-12">
        {data.map(group => (
          <section
            key={group.tipologia}
            className="bg-white/90 rounded-3xl border border-[#e6e9ef] shadow-xl p-8 relative hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="absolute -top-8 left-4 px-4 py-2 rounded-2xl text-white text-xl font-bold shadow bg-gradient-to-r from-[#2b59ff] to-[#00c9a7] uppercase tracking-wide">
              {group.tipologia}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {Object.entries(groupVariants(group.variants)).map(([colore, taglieObj]) => (
                <div
                  key={colore}
                  className="bg-[#f5f7fa] rounded-2xl p-6 shadow-inner border border-[#e6e9ef] hover:shadow-lg transition"
                >
                  <h3 className="text-2xl font-bold mb-6 capitalize flex items-center gap-3">
                    <span
                      className="inline-block w-6 h-6 rounded-full border border-[#ccc] bg-white"
                      style={{
                        background: colore !== "Sconosciuto" ? colore : "#eee",
                        borderColor: "#aaa",
                      }}
                    />
                    {colore}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-[#1d1d1f] text-lg font-semibold">Taglia</th>
                          <th className="px-4 py-2 text-center text-[#1d1d1f] text-lg font-semibold">
                            Venduto <span className="text-xs text-[#00c9a7]">(ultimi {periodDays} gg)</span>
                          </th>
                          <th className="px-4 py-2 text-center text-[#1d1d1f] text-lg font-semibold">
                            Stock
                          </th>
                          <th className="px-4 py-2 text-center text-[#1d1d1f] text-lg font-semibold">
                            Giorni rimasti
                          </th>
                          <th className="px-4 py-2 text-center text-[#1d1d1f] text-lg font-semibold">
                            <span className="text-[#2b59ff]">Da acquistare</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(taglieObj)
                          .sort(([tagliaA], [tagliaB]) => {
                            const order = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
                            const iA = order.indexOf(tagliaA.toLowerCase());
                            const iB = order.indexOf(tagliaB.toLowerCase());
                            if (iA === -1 && iB === -1) return tagliaA.localeCompare(tagliaB);
                            if (iA === -1) return 1;
                            if (iB === -1) return -1;
                            return iA - iB;
                          })
                          .map(([taglia, vars]) => {
                            const v = vars[0];
                            const dailyConsumption = v.venduto / periodDays;
                            const daysRemaining =
                              dailyConsumption > 0 ? Math.floor(v.stock / dailyConsumption) : '∞';
                            const purchaseSuggestion =
                              dailyConsumption > 0
                                ? Math.max(0, Math.ceil(dailyConsumption * 30 - v.stock))
                                : 0;
                            const urgent = typeof daysRemaining === 'number' && daysRemaining <= 7;

                            return (
                              <tr
                                key={taglia}
                                className="transition transform hover:scale-[1.015]"
                              >
                                <td>
                                  <span
                                    className={`inline-block px-3 py-1 rounded-xl text-base font-bold border border-[#2b59ff]/20 shadow-sm
                                      ${urgent ? 'bg-[#ffeaea] text-[#d93025] border-[#d93025]/40' : 'bg-white text-[#222]'}
                                    `}
                                  >
                                    {taglia}
                                  </span>
                                </td>
                                <td className="text-center text-lg font-medium">{v.venduto}</td>
                                <td className="text-center font-bold text-lg">{v.stock}</td>
                                <td
                                  className={`text-center text-lg font-bold
                                    ${urgent ? 'text-[#d93025]' : 'text-[#22223b]'}
                                  `}
                                >
                                  {daysRemaining}
                                </td>
                                <td className="text-center text-lg font-extrabold">
                                  {purchaseSuggestion > 0 ? (
                                    <span className="bg-[#00c9a7]/10 text-[#00c9a7] px-4 py-2 rounded-xl shadow font-bold animate-pulse">
                                      +{purchaseSuggestion} acquista ora
                                    </span>
                                  ) : (
                                    <span className="text-[#6e6e73]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}