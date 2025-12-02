"use client";

import React, { useEffect, useState, useMemo } from "react";

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
  blu: "#2563EB",
  verde: "#16A34A",
  giallo: "#EAB308",
  rosa: "#EC4899",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function BlanksStockPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  // === Fetch ===
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/shopify2/catalog/blanks-stock-view");
        if (!r.ok) throw new Error("Errore nel caricamento");
        const json = await r.json();
        setData(json.blanks || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // === Stats ===
  const stats = useMemo(() => {
    let total = 0,
      low = 0,
      out = 0;
    data.forEach((b) =>
      b.inventory.forEach((v: any) => {
        total++;
        if (v.stock === 0) out++;
        else if (v.stock <= 5) low++;
      })
    );
    return { total, low, out };
  }, [data]);

  // === Filters ===
  const filtered = useMemo(() => {
    return data
      .map((blank) => ({
        ...blank,
        inventory: blank.inventory
          .filter((v: any) => {
            const s =
              blank.blank_key.toLowerCase().includes(search.toLowerCase()) ||
              v.colore.toLowerCase().includes(search.toLowerCase()) ||
              v.taglia.toLowerCase().includes(search.toLowerCase());

            const f =
              filter === "all" ||
              (filter === "out" && v.stock === 0) ||
              (filter === "low" && v.stock <= 5 && v.stock > 0);

            return s && f;
          })
          .sort((a: any, b: any) => {
            const sa = SIZE_ORDER.indexOf(a.taglia.toUpperCase());
            const sb = SIZE_ORDER.indexOf(b.taglia.toUpperCase());
            if (sa !== sb) return sa - sb;
            return a.colore.localeCompare(b.colore);
          }),
      }))
      .filter((b) => b.inventory.length > 0);
  }, [data, search, filter]);

  // === UI ===
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold text-gray-600">
        Caricamento…
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-red-600 font-semibold">
        Errore: {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#e0f2fe] p-6">
      {/* === HEADER === */}
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2b59ff] to-[#00c9a7]">
          Stock Blanks
        </h1>
        <p className="text-gray-600 mt-1 font-medium">
          Inventario base sincronizzato
        </p>

        {/* STATS */}
        <div className="flex gap-4 mt-6">
          <div className="bg-white border px-5 py-3 rounded-2xl shadow">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-600">Varianti Totali</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 px-5 py-3 rounded-2xl shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.low}</div>
            <div className="text-xs text-yellow-700">Stock Basso</div>
          </div>
          <div className="bg-red-50 border border-red-200 px-5 py-3 rounded-2xl shadow">
            <div className="text-2xl font-bold text-red-600">{stats.out}</div>
            <div className="text-xs text-red-700">Esauriti</div>
          </div>
        </div>

        {/* SEARCH + FILTERS */}
        <div className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="🔍 Cerca colore, taglia o categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border shadow-sm bg-white outline-none focus:ring-2 focus:ring-blue-300"
          />

          <button
            className={`px-4 py-3 rounded-xl font-semibold transition ${
              filter === "all"
                ? "bg-blue-500 text-white"
                : "bg-white border text-gray-600"
            }`}
            onClick={() => setFilter("all")}
          >
            Tutti
          </button>
          <button
            className={`px-4 py-3 rounded-xl font-semibold transition ${
              filter === "low"
                ? "bg-yellow-500 text-white"
                : "bg-white border text-gray-600"
            }`}
            onClick={() => setFilter("low")}
          >
            Stock basso
          </button>
          <button
            className={`px-4 py-3 rounded-xl font-semibold transition ${
              filter === "out"
                ? "bg-red-500 text-white"
                : "bg-white border text-gray-600"
            }`}
            onClick={() => setFilter("out")}
          >
            Esauriti
          </button>
        </div>
      </div>

      {/* === GRID CARDS === */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((blank) => (
          <div
            key={blank.blank_key}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition"
          >
            {/* CARD HEADER */}
            <div className="bg-gradient-to-r from-[#2b59ff] to-[#00c9a7] p-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                👕 {blank.blank_key.replaceAll("_", " ")}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {blank.inventory.length} varianti
              </p>
            </div>

            {/* TABLE */}
            <div className="p-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                      Colore
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                      Taglia
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-600">
                      Stock
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {blank.inventory.map((v: any) => (
                    <tr
                      key={v.id}
                      className="bg-white rounded-xl shadow hover:scale-[1.01] transition"
                    >
                      {/* COLORE */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border"
                            style={{
                              backgroundColor:
                                COLOR_MAP[v.colore.toLowerCase()] || "#ccc",
                            }}
                          />
                          <span className="capitalize font-medium">
                            {v.colore}
                          </span>
                        </div>
                      </td>

                      {/* TAGLIA */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-3 py-1 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 font-bold uppercase">
                          {v.taglia}
                        </span>
                      </td>

                      {/* STOCK */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-4 py-1 rounded-xl font-bold text-white ${
                            v.stock === 0
                              ? "bg-red-500"
                              : v.stock <= 5
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        >
                          {v.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}