'use client';
import { useState, useEffect } from "react";

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
  const periodDays = 30;

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/products/sales');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json: TypeGroup[] = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="bg-[#f5f5f7] min-h-screen px-0 py-10 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-10">Previsionale Magazzino Blanks</h1>
        {error && <div className="bg-red-100 text-red-700 px-6 py-3 rounded-lg mb-8">{error}</div>}
        {data.length === 0 && !error && (
          <div className="text-gray-500 text-center">Caricamento dati in corso…</div>
        )}

        {data.map((group) => (
          <section key={group.tipologia} className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 capitalize">{group.tipologia}</h2>
            <div className="overflow-x-auto rounded-2xl shadow-md bg-white">
              <table className="w-full text-left text-gray-700 border-separate [border-spacing:0]">
                <thead className="bg-[#f0f0f5]">
                  <tr>
                    <th className="py-3 px-4">Colore</th>
                    <th className="py-3 px-4">Taglia</th>
                    <th className="py-3 px-4 text-center">Venduto<br/>(ultimi {periodDays}gg)</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-center">Giorni residui</th>
                    <th className="py-3 px-4 text-center">Suggerito acquisto</th>
                  </tr>
                </thead>
                <tbody>
                  {group.variants.map((v, i) => {
                    const [taglia = "", colore = ""] = (v.variante ?? "").split("/").map(x => x.trim());
                    const venduto = v.venduto ?? 0;
                    const stock = v.stock ?? 0;
                    const daily = venduto / periodDays;
                    const giorni = daily > 0 ? Math.floor(stock / daily) : "∞";
                    const acquisto = daily > 0 ? Math.max(0, Math.ceil(daily * 30 - stock)) : 0;
                    return (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="py-2 px-4 capitalize">{colore}</td>
                        <td className="py-2 px-4 capitalize">{taglia}</td>
                        <td className="py-2 px-4 text-center">{venduto}</td>
                        <td className="py-2 px-4 text-center">{stock}</td>
                        <td className={`py-2 px-4 text-center font-semibold ${typeof giorni === "number" && giorni <= 7 ? "text-red-500" : ""}`}>{giorni}</td>
                        <td className="py-2 px-4 text-center">{acquisto}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}