"use client";

import { useEffect, useState } from "react";

export default function BlanksStockPage() {
  const [loading, setLoading] = useState(true);
  const [blanks, setBlanks] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
      const data = await res.json();
      setBlanks(data.blanks || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-gray-500 animate-pulse">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#eef1ff] to-[#e6f9f5] p-6">
      <div className="max-w-6xl mx-auto space-y-12">

        {blanks.map((blank) => (
          <div key={blank.blank_key} className="space-y-6">

            {/* TITOLO CATEGORIA */}
            <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2b59ff] to-[#00c9a7] capitalize">
              {blank.blank_key.replace("_", " ")}
            </div>

            {/* GRID CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {blank.inventory
                .sort((a, b) => a.colore.localeCompare(b.colore))
                .map((v: any) => (
                <div
                  key={v.id}
                  className="rounded-2xl bg-white border shadow-sm p-4 flex flex-col items-center text-center hover:shadow-md transition-all"
                >
                  {/* COLORE */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: v.colore }}
                    />
                    <span className="text-sm text-gray-600 capitalize">{v.colore}</span>
                  </div>

                  {/* TAGLIA */}
                  <div className="text-xl font-bold">{v.taglia}</div>

                  {/* STOCK BADGE */}
                  <div
                    className={`
                      mt-3 w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold
                      ${
                        v.stock === 0
                          ? "bg-red-500"
                          : v.stock <= 5
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }
                    `}
                  >
                    {v.stock}
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}