"use client";

import React, { useEffect, useState, useMemo } from "react";

const COLOR_MAP: Record<string, string> = {
  nero: "#000000",
  bianco: "#FFFFFF",
  navy: "#001F3F",
  "dark grey": "#4A5568",
  "sport grey": "#A0AEC0",
  grigio: "#718096",
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
  royal: "#2C5AA0",
  viola: "#7C3AED",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function BlanksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");

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

  // Calcolo statistiche globali
  const stats = useMemo(() => {
    let totalVariants = 0;
    let outOfStock = 0;
    let lowStock = 0;
    
    data.forEach((blank) => {
      blank.inventory.forEach((v: any) => {
        totalVariants++;
        if (v.stock === 0) outOfStock++;
        else if (v.stock > 0 && v.stock <= 5) lowStock++;
      });
    });

    return { totalVariants, outOfStock, lowStock };
  }, [data]);

  // Filtraggio dati
  const filteredData = useMemo(() => {
    return data
      .map((blank) => ({
        ...blank,
        inventory: blank.inventory
          .filter((v: any) => {
            // Filtro per termine di ricerca
            const matchSearch = 
              blank.blank_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.colore.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.taglia.toLowerCase().includes(searchTerm.toLowerCase());

            // Filtro per stock
            const matchStock =
              filterStock === "all" ||
              (filterStock === "out" && v.stock === 0) ||
              (filterStock === "low" && v.stock > 0 && v.stock <= 5);

            return matchSearch && matchStock;
          })
          .sort((a: any, b: any) => {
            // Ordina per taglia poi colore
            const sizeA = SIZE_ORDER.indexOf(a.taglia.toUpperCase());
            const sizeB = SIZE_ORDER.indexOf(b.taglia.toUpperCase());
            if (sizeA !== sizeB) return sizeA - sizeB;
            return a.colore.localeCompare(b.colore);
          }),
      }))
      .filter((blank) => blank.inventory.length > 0);
  }, [data, searchTerm, filterStock]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento stock...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header con Stats */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📦 Stock Blanks
              </h1>
              <p className="text-gray-600">Gestione inventario prodotti base</p>
            </div>

            {/* Stats Cards */}
            <div className="flex gap-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalVariants}
                </div>
                <div className="text-xs text-blue-700 font-medium">
                  Varianti Totali
                </div>
              </div>
              <div className="bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.lowStock}
                </div>
                <div className="text-xs text-yellow-700 font-medium">
                  Stock Basso
                </div>
              </div>
              <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                <div className="text-2xl font-bold text-red-600">
                  {stats.outOfStock}
                </div>
                <div className="text-xs text-red-700 font-medium">
                  Esauriti
                </div>
              </div>
            </div>
          </div>

          {/* Filtri e Ricerca */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 Cerca per prodotto, colore o taglia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStock("all")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filterStock === "all"
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilterStock("low")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filterStock === "low"
                    ? "bg-yellow-500 text-white shadow-lg shadow-yellow-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Stock Basso
              </button>
              <button
                onClick={() => setFilterStock("out")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filterStock === "out"
                    ? "bg-red-500 text-white shadow-lg shadow-red-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
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
        {filteredData.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nessun risultato
            </h3>
            <p className="text-gray-500">
              Prova a modificare i filtri di ricerca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredData.map((blank) => (
              <div
                key={blank.blank_key}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white capitalize flex items-center gap-2">
                    <span>👕</span>
                    {blank.blank_key.replaceAll("_", " ")}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {blank.inventory.length} varianti disponibili
                  </p>
                </div>

                {/* Varianti Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {blank.inventory.map((v: any) => (
                      <div
                        key={v.id}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${
                          v.stock === 0
                            ? "bg-red-50 border-red-200"
                            : v.stock <= 5
                            ? "bg-yellow-50 border-yellow-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        {/* Colore */}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-5 h-5 rounded-full border-2 border-gray-300 shadow-sm"
                            style={{
                              backgroundColor: COLOR_MAP[v.colore] || "#CCCCCC",
                            }}
                          />
                          <span className="text-xs font-medium text-gray-700 capitalize truncate">
                            {v.colore}
                          </span>
                        </div>

                        {/* Taglia */}
                        <div className="text-center mb-2">
                          <span className="text-lg font-bold text-gray-900">
                            {v.taglia}
                          </span>
                        </div>

                        {/* Stock Badge */}
                        <div className="text-center">
                          <span
                            className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${
                              v.stock === 0
                                ? "bg-red-500 text-white"
                                : v.stock <= 5
                                ? "bg-yellow-500 text-white"
                                : "bg-green-500 text-white"
                            }`}
                          >
                            {v.stock === 0 ? "OUT" : v.stock}
                          </span>
                        </div>

                        {/* Alert Icon per stock basso */}
                        {v.stock > 0 && v.stock <= 5 && (
                          <div className="absolute top-1 right-1">
                            <span className="text-xs">⚠️</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
