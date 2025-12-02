'use client';

import React, { useEffect, useState, useMemo } from "react";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

const COLOR_MAP: Record<string, string> = {
  nero: "#000000",
  bianco: "#FFFFFF",
  navy: "#001F3F",
  "dark grey": "#4A5568",
  "sport grey": "#A0AEC0",
  panna: "#F7FAFC",
  sand: "#D4C5B9",
  army: "#4A5043",
  bordeaux: "#722F37",
  "night blue": "#1A365D",
  rosso: "#DC2626",
  verde: "#16A34A",
};

export default function BlanksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
        const json = await res.json();
        setData(json.blanks || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const grouped = useMemo(() => {
    return data.map((blank: any) => {
      const colors: Record<string, any[]> = {};

      blank.inventory.forEach((v: any) => {
        if (!colors[v.colore]) colors[v.colore] = [];
        colors[v.colore].push(v);
      });

      // ordina taglie
      Object.keys(colors).forEach((c) => {
        colors[c].sort((a, b) => {
          const ia = SIZE_ORDER.indexOf(a.taglia.toUpperCase());
          const ib = SIZE_ORDER.indexOf(b.taglia.toUpperCase());
          return ia - ib;
        });
      });

      return { blank_key: blank.blank_key, colors };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-10 text-center">
        📦 Stock Blanks
      </h1>

      <div className="flex flex-col gap-10">
        {grouped.map((group) => (
          <div key={group.blank_key} className="bg-white shadow-xl rounded-3xl p-8 border border-gray-100">
            {/* HEADER */}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 capitalize">
              {group.blank_key.replaceAll("_", " ")}
            </h2>

            {/* COLOR GROUPS */}
            <div className="flex flex-col gap-8">
              {Object.entries(group.colors).map(([color, variants]) => (
                <div key={color} className="bg-gray-50 rounded-2xl p-6 shadow-inner">
                  {/* COLOR TITLE */}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="w-6 h-6 rounded-full border border-gray-300 shadow"
                      style={{ backgroundColor: COLOR_MAP[color] || "#ccc" }}
                    />
                    <h3 className="text-2xl font-semibold capitalize">{color}</h3>
                  </div>

                  {/* TAGLIE GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                    {variants.map((v) => (
                      <div
                        key={v.id}
                        className={`rounded-2xl p-4 shadow-md border-2 transition-all bg-white hover:scale-[1.02] 
                          ${v.stock === 0
                            ? "border-red-300 bg-red-50"
                            : v.stock <= 5
                            ? "border-yellow-300 bg-yellow-50"
                            : "border-green-300 bg-green-50/30"
                          }`}
                      >
                        {/* TAGLIA */}
                        <div className="text-xl font-bold text-gray-900 text-center mb-2">
                          {v.taglia}
                        </div>

                        {/* STOCK */}
                        <div className="flex justify-center mb-3">
                          <span
                            className={`px-4 py-1 text-lg font-bold rounded-xl
                              ${v.stock === 0
                                ? "bg-red-500 text-white"
                                : v.stock <= 5
                                ? "bg-yellow-500 text-white"
                                : "bg-green-500 text-white"
                              }
                            `}
                          >
                            {v.stock}
                          </span>
                        </div>

                        {/* INPUT PER AGGIORNARE STOCK */}
                        <input
                          type="number"
                          placeholder="Aggiorna"
                          className="w-full rounded-xl border border-gray-300 px-3 py-1 text-center 
                            focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all bg-white"
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              v.newStock = value;
                            }
                          }}
                        />

                        {/* BUTTON (non ancora attivo) */}
                        <button
                          className="mt-3 w-full bg-blue-600 text-white font-bold py-1.5 rounded-xl shadow hover:bg-blue-700 transition-all"
                          onClick={() => {
                            alert(`TODO: aggiorna stock ${v.taglia} ${color}`);
                          }}
                        >
                          Salva
                        </button>
                      </div>
                    ))}
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