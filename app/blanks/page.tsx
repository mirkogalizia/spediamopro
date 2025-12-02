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

  if (loading) return <div>Caricamento…</div>;
  if (error) return <div>Errore: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Stock Blanks</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.map((blank) => (
          <div
            key={blank.blank_key}
            className="bg-white rounded-xl shadow p-5"
          >
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {blank.blank_key.replaceAll("_", " ")}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {blank.inventory.map((v: any) => (
                <div
                  key={v.id}
                  className="p-3 bg-gray-50 rounded-lg border flex flex-col items-center"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: COLOR_MAP[v.colore] || "#ccc" }}
                    />
                    <span className="capitalize text-sm">{v.colore}</span>
                  </div>

                  <span className="font-semibold mt-1">{v.taglia}</span>

                  <span
                    className={`mt-2 px-3 py-1 rounded text-sm font-semibold ${
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