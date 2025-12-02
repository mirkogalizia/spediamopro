"use client";

import { useEffect, useState, useMemo } from "react";

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

const COLOR_DOTS: Record<string, string> = {
  nero: "bg-black",
  bianco: "bg-white border-2 border-gray-300",
  navy: "bg-blue-900",
  "dark grey": "bg-gray-700",
  "sport grey": "bg-gray-400",
  grigio: "bg-gray-500",
  panna: "bg-amber-50 border-2 border-amber-200",
  sand: "bg-yellow-200",
  army: "bg-green-800",
  bordeaux: "bg-red-900",
  "night blue": "bg-indigo-900",
  rosso: "bg-red-600",
  blu: "bg-blue-600",
  verde: "bg-green-600",
  giallo: "bg-yellow-400",
  rosa: "bg-pink-400",
  royal: "bg-blue-700",
  viola: "bg-purple-600",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function BlanksPage() {
  const [blanks, setBlanks] = useState<Blank[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/shopify2/catalog/blanks-stock-view", {
        cache: "no-store",
      });
      const json = await res.json();
      setBlanks(json.blanks || []);
    } catch (err) {
      console.error("Errore load:", err);
    }
    setLoading(false);
  }

  async function updateStock(variantId: string, blankKey: string) {
    const value = Number(newStock[variantId]);

    if (!newStock[variantId] || isNaN(value)) {
      alert("❌ Inserisci un numero valido");
      return;
    }

    try {
      await fetch("/api/shopify2/catalog/sync-blanks-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id: variantId,
          new_stock: value,
          blank_key: blankKey,
        }),
      });

      setNewStock((prev) => ({ ...prev, [variantId]: "" }));
      await loadData();
    } catch (err) {
      alert("❌ Errore durante l'aggiornamento");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let outOfStock = 0;
    let lowStock = 0;

    blanks.forEach((blank) => {
      blank.inventory.forEach((v) => {
        total++;
        if (v.stock === 0) outOfStock++;
        else if (v.stock > 0 && v.stock <= 5) lowStock++;
      });
    });

    return { total, outOfStock, lowStock };
  }, [blanks]);

  const filteredBlanks = useMemo(() => {
    return blanks
      .map((blank) => ({
        ...blank,
        inventory: blank.inventory
          .filter((v) => {
            const matchSearch =
              blank.blank_key.toLowerCase().includes(search) ||
              v.colore.toLowerCase().includes(search) ||
              v.taglia.toLowerCase().includes(search);

            const matchStock =
              filterStock === "all" ||
              (filterStock === "out" && v.stock === 0) ||
              (filterStock === "low" && v.stock > 0 && v.stock <= 5);

            return matchSearch && matchStock;
          })
          .sort((a, b) => {
            const sizeA = SIZE_ORDER.indexOf(a.taglia.toUpperCase());
            const sizeB = SIZE_ORDER.indexOf(b.taglia.toUpperCase());
            if (sizeA !== sizeB) return sizeA - sizeB;
            return a.colore.localeCompare(b.colore);
          }),
      }))
      .filter((blank) => blank.inventory.length > 0);
  }, [blanks, search, filterStock]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg font-medium text-gray-600">Caricamento stock...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📦 Stock Blanks
              </h1>
              <p className="text-gray-600">Gestione inventario prodotti base</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Varianti Totali
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl">
                  📦
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Stock Basso
                  </p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.lowStock}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center text-white text-2xl">
                  ⚠️
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-900">Esauriti</p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.outOfStock}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl">
                  🚫
                </div>
              </div>
            </div>
          </div>

          {/* Filtri */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 Cerca per categoria, colore o taglia..."
                value={search}
                onChange={(e) => setSearch(e.target.value.toLowerCase())}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStock("all")}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  filterStock === "all"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilterStock("low")}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  filterStock === "low"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Stock Basso
              </button>
              <button
                onClick={() => setFilterStock("out")}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  filterStock === "out"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Esauriti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredBlanks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nessun risultato
            </h3>
            <p className="text-gray-500">
              Prova a modificare i filtri di ricerca
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredBlanks.map((blank) => {
              const grouped: Record<string, Variant[]> = {};
              blank.inventory.forEach((v) => {
                if (!grouped[v.colore]) grouped[v.colore] = [];
                grouped[v.colore].push(v);
              });

              return (
                <div
                  key={blank.blank_key}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-white">
                    <h2 className="text-2xl font-bold capitalize flex items-center gap-2">
                      👕 {blank.blank_key.replaceAll("_", " ")}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {blank.inventory.length} varianti disponibili
                    </p>
                  </div>

                  <div className="p-6">
                    {Object.entries(grouped).map(([colore, variants]) => (
                      <div key={colore} className="mb-8 last:mb-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className={`w-6 h-6 rounded-full ${
                              COLOR_DOTS[colore] || "bg-gray-400"
                            }`}
                          />
                          <h3 className="text-lg font-bold capitalize">
                            {colore}
                          </h3>
                          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                            {variants.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {variants.map((v) => (
                            <div
                              key={v.id}
                              className={`rounded-xl border-2 p-4 transition-all hover:shadow-lg ${
                                v.stock === 0
                                  ? "border-red-300 bg-red-50"
                                  : v.stock <= 5
                                  ? "border-yellow-300 bg-yellow-50"
                                  : "border-green-300 bg-green-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl font-bold">
                                  {v.taglia}
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-lg text-sm font-bold ${
                                    v.stock === 0
                                      ? "bg-red-600 text-white"
                                      : v.stock <= 5
                                      ? "bg-yellow-600 text-white"
                                      : "bg-green-600 text-white"
                                  }`}
                                >
                                  {v.stock === 0 ? "OUT" : v.stock}
                                </span>
                              </div>

                              <div className="h-px bg-gray-300 my-3"></div>

                              <div className="space-y-2">
                                <input
                                  type="number"
                                  placeholder="Nuovo stock..."
                                  value={newStock[v.id] || ""}
                                  onChange={(e) =>
                                    setNewStock((prev) => ({
                                      ...prev,
                                      [v.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                />
                                <button
                                  onClick={() =>
                                    updateStock(v.id, blank.blank_key)
                                  }
                                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                                >
                                  Aggiorna
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {Object.keys(grouped).length > 1 && (
                          <div className="h-px bg-gray-300 mt-8"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

