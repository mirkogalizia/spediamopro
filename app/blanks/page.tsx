"use client";

import React, { useEffect, useState } from "react";

const COLOR_MAP: Record<string, string> = {
  nero: "#000000",
  bianco: "#FFFFFF",
  navy: "#001f3f",
  grigio: "#808080",
  rosso: "#DC2626",
  blu: "#2563EB",
  verde: "#16A34A",
  giallo: "#EAB308",
  rosa: "#EC4899",
};

export default function BlanksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
        if (!res.ok) throw new Error("Errore nel caricamento dei dati");
        const json = await res.json();
        setData(json.blanks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold text-gray-600">
        Caricamento stock…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Errore</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Nessun blank disponibile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Stock Blanks
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.map((blank) => (
          <div
            key={blank.blank_key}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 capitalize">
              {blank.blank_key.replaceAll("_", " ")}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {blank.inventory.map((v: any) => (
                <div
                  key={v.id}
                  className="bg-gray-50 p-3 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: COLOR_MAP[v.colore.toLowerCase()] || "#CCCCCC",
                      }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {v.colore}
                    </span>
                  </div>

                  <span className="text-md font-bold">{v.taglia}</span>

                  <span
                    className={`mt-2 text-sm font-semibold px-3 py-1 rounded-lg ${
                      v.stock === 0
                        ? "bg-red-100 text-red-700"
                        : v.stock <= 5
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {v.stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
