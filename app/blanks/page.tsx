"use client";

import React, { useEffect, useState } from "react";

export default function BlanksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
      const json = await res.json();
      setData(json.blanks || []);
      setLoading(false);
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
              {blank.blank_key.replace("_", " ")}
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {blank.inventory.map((v: any) => (
                <div
                  key={v.id}
                  className="bg-gray-50 p-3 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Cerchio colore */}
                    <span
                      className="inline-block w-4 h-4 rounded-full border"
                      style={{
                        backgroundColor:
                          v.colore === "nero"
                            ? "#000"
                            : v.colore === "bianco"
                            ? "#fff"
                            : v.colore === "navy"
                            ? "#001f3f"
                            : "#ccc",
                      }}
                    />

                    <span className="text-sm font-medium capitalize">
                      {v.colore}
                    </span>
                  </div>

                  <span className="text-md font-bold">{v.taglia}</span>

                  <span
                    className={`mt-2 text-sm font-semibold px-3 py-1 rounded-lg
                      ${
                        v.stock === 0
                          ? "bg-red-100 text-red-700"
                          : v.stock <= 5
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }
                    `}
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