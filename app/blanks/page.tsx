"use client";

import { useEffect, useState } from "react";

type Variant = {
  id: string;
  taglia: string;
  colore: string;
  stock: number;
};

type Blank = {
  blank_key: string;
  inventory: Variant[];
};

export default function BlanksPage() {
  const [blanks, setBlanks] = useState<Blank[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState<{ [key: string]: number }>({});
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/shopify2/catalog/blanks-stock-view", {
        cache: "no-store",
      });
      const json = await res.json();
      setBlanks(json.blanks);
    } catch (err) {
      console.error("Errore load:", err);
    }
    setLoading(false);
  }

  async function updateStock(variantId: string, blankKey: string) {
    const value = newStock[variantId];

    if (value == null || Number.isNaN(value))
      return alert("Inserisci un numero valido");

    await fetch("/api/shopify2/catalog/sync-blanks-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant_id: variantId,
        new_stock: value,
        blank_key: blankKey,
      }),
    });

    alert("Stock aggiornato!");
    loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading)
    return (
      <div className="text-center pt-20 text-xl font-semibold">
        Caricamento...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto pt-10 pb-20 px-6">
      <h1 className="text-4xl font-bold text-center mb-10 flex items-center justify-center gap-2">
        📦 Stock Blanks
      </h1>

      {/* 🔍 SEARCH */}
      <div className="mb-8">
        <input
          type="text"
          value={search}
          placeholder="Cerca colore, taglia o categoria..."
          onChange={(e) => setSearch(e.target.value.toLowerCase())}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
      </div>

      {blanks.map((blank) => {
        // grouping by color
        const grouped: Record<string, Variant[]> = {};
        blank.inventory.forEach((v) => {
          if (!grouped[v.colore]) grouped[v.colore] = [];
          grouped[v.colore].push(v);
        });

        return (
          <div
            key={blank.blank_key}
            className="mb-12 bg-white shadow-xl rounded-2xl overflow-hidden"
          >
            {/* header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-teal-500 text-white">
              <h2 className="text-2xl font-semibold capitalize">
                {blank.blank_key.replace(/_/g, " ")}
              </h2>
              <p className="text-sm opacity-80">
                {blank.inventory.length} varianti
              </p>
            </div>

            {/* GRIGLIA PER COLORE */}
            <div className="p-6 space-y-10">
              {Object.entries(grouped).map(([colore, variants]) => (
                <div key={colore} className="border-b pb-6">
                  <h3 className="text-xl font-bold capitalize mb-4 flex items-center gap-2">
                    🎨 {colore}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {variants.map((v) => (
                      <div
                        key={v.id}
                        className="border rounded-xl p-4 shadow-md bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="font-semibold text-lg">
                          Taglia:{" "}
                          <span className="font-bold text-blue-600 uppercase">
                            {v.taglia}
                          </span>
                        </div>

                        <div className="mt-2 text-gray-700">
                          Stock attuale:{" "}
                          <span
                            className={`font-bold ${
                              v.stock <= 0
                                ? "text-red-600"
                                : v.stock <= 5
                                ? "text-orange-500"
                                : "text-green-600"
                            }`}
                          >
                            {v.stock}
                          </span>
                        </div>

                        {/* INPUT STOCK */}
                        <input
                          type="number"
                          placeholder="Nuovo stock"
                          className="w-full mt-3 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={newStock[v.id] ?? ""}
                          onChange={(e) =>
                            setNewStock((prev) => ({
                              ...prev,
                              [v.id]: Number(e.target.value), // <-- FIX DEFINITIVO
                            }))
                          }
                        />

                        {/* BUTTON UPDATE */}
                        <button
                          onClick={() => updateStock(v.id, blank.blank_key)}
                          className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                          Aggiorna
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}