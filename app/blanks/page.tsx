"use client";

import { useEffect, useState, useMemo } from "react";

type Variant = {
  id: string;
  taglia: string;
  colore: string;
  stock: number;
  variant_id?: number;
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
  const [syncing, setSyncing] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [newStock, setNewStock] = useState<Record<number, string>>({});
  const [updateMode, setUpdateMode] = useState<"set" | "add">("set");
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

  async function syncFromShopify() {
    if (!confirm("🔄 Scaricare lo stock aggiornato da Shopify?")) {
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/shopify2/catalog/build-blanks-stock");
      const json = await res.json();
      
      if (json.ok) {
        alert(`✅ ${json.processed.length} blanks aggiornati`);
        await loadData();
      } else {
        alert(`❌ Errore: ${json.error || json.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Errore durante la sincronizzazione");
    }
    setSyncing(false);
  }

  async function updateStock(variantId: number, blankKey: string, currentStock: number) {
    const value = Number(newStock[variantId]);

    if (!newStock[variantId] || isNaN(value)) {
      alert("❌ Inserisci un numero valido");
      return;
    }

    const finalStock = updateMode === "add" ? currentStock + value : value;
    const confirmMsg = updateMode === "add" 
      ? `➕ Aggiungere ${value}? (${currentStock} → ${finalStock})`
      : `🔄 Impostare a ${value}? (da ${currentStock})`;

    if (!confirm(confirmMsg)) return;

    setUpdating(variantId);

    try {
      const res = await fetch("/api/shopify2/catalog/update-blank-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id: variantId,
          new_stock: value,
          blank_key: blankKey,
          mode: updateMode,
        }),
      });

      const json = await res.json();
      
      if (json.ok) {
        alert(`✅ Stock: ${json.previous_stock} → ${json.new_stock}\n🎨 Grafiche: ${json.graphics_updated}`);
        setNewStock((prev) => ({ ...prev, [variantId]: "" }));
        await loadData();
      } else {
        alert(`❌ ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Errore durante l'aggiornamento");
    }
    
    setUpdating(null);
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
        if (v.stock <= 0) outOfStock++;
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
              (filterStock === "out" && v.stock <= 0) ||
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-700">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header Compatto */}
      <div className="bg-white shadow border-b sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">📦</span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800">Stock Blanks</h1>
                <p className="text-xs text-gray-500">Gestione inventario</p>
              </div>
            </div>

            <button
              onClick={syncFromShopify}
              disabled={syncing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sync...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Sync</span>
                </>
              )}
            </button>
          </div>

          {/* Stats Compatte */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-blue-500 rounded-lg p-3 text-white">
              <p className="text-xs font-semibold opacity-90">Totali</p>
              <p className="text-2xl font-black">{stats.total}</p>
            </div>
            <div className="bg-yellow-500 rounded-lg p-3 text-white">
              <p className="text-xs font-semibold opacity-90">Bassi</p>
              <p className="text-2xl font-black">{stats.lowStock}</p>
            </div>
            <div className="bg-red-500 rounded-lg p-3 text-white">
              <p className="text-xs font-semibold opacity-90">Esauriti</p>
              <p className="text-2xl font-black">{stats.outOfStock}</p>
            </div>
          </div>

          {/* Modalità Update Compatta */}
          <div className="bg-purple-600 rounded-lg p-3 mb-3 flex items-center justify-between">
            <p className="text-white text-sm font-bold">
              {updateMode === "set" ? "🔄 Sostituisci" : "➕ Somma"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setUpdateMode("set")}
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                  updateMode === "set"
                    ? "bg-white text-purple-600"
                    : "bg-white/20 text-white"
                }`}
              >
                Sostituisci
              </button>
              <button
                onClick={() => setUpdateMode("add")}
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                  updateMode === "add"
                    ? "bg-white text-purple-600"
                    : "bg-white/20 text-white"
                }`}
              >
                Somma
              </button>
            </div>
          </div>

          {/* Filtri Compatti */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toLowerCase())}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <button
              onClick={() => setFilterStock("all")}
              className={`px-3 py-2 rounded-lg text-sm font-bold ${
                filterStock === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilterStock("low")}
              className={`px-3 py-2 rounded-lg text-sm font-bold ${
                filterStock === "low"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Bassi
            </button>
            <button
              onClick={() => setFilterStock("out")}
              className={`px-3 py-2 rounded-lg text-sm font-bold ${
                filterStock === "out"
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Content Compatto */}
      <div className="max-w-[1800px] mx-auto px-4 py-4">
        {filteredBlanks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-xl font-bold text-gray-800">Nessun risultato</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBlanks.map((blank) => {
              const grouped: Record<string, Variant[]> = {};
              blank.inventory.forEach((v) => {
                if (!grouped[v.colore]) grouped[v.colore] = [];
                grouped[v.colore].push(v);
              });

              return (
                <div key={blank.blank_key} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Header Blank */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2">
                    <h2 className="text-lg font-black text-white capitalize flex items-center gap-2">
                      <span className="text-xl">👕</span>
                      {blank.blank_key.replaceAll("_", " ")}
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {blank.inventory.length}
                      </span>
                    </h2>
                  </div>

                  {/* Varianti per Colore */}
                  <div className="p-4">
                    {Object.entries(grouped).map(([colore, variants], idx) => (
                      <div key={colore} className={idx > 0 ? "mt-4 pt-4 border-t" : ""}>
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={`w-6 h-6 rounded-full ${
                              COLOR_DOTS[colore] || "bg-gray-400"
                            }`}
                          />
                          <h3 className="text-base font-bold capitalize">{colore}</h3>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full font-semibold">
                            {variants.length}
                          </span>
                        </div>

                        {/* Grid Compatta */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                          {variants.map((v) => {
                            const varId = v.variant_id || 0;
                            return (
                              <div
                                key={v.id}
                                className={`border-2 rounded-lg p-3 ${
                                  v.stock <= 0
                                    ? "border-red-400 bg-red-50"
                                    : v.stock <= 5
                                    ? "border-yellow-400 bg-yellow-50"
                                    : "border-green-400 bg-green-50"
                                }`}
                              >
                                {/* Header Card */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xl font-black">{v.taglia}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-black ${
                                      v.stock <= 0
                                        ? "bg-red-600 text-white"
                                        : v.stock <= 5
                                        ? "bg-yellow-600 text-white"
                                        : "bg-green-600 text-white"
                                    }`}
                                  >
                                    {v.stock <= 0 ? "OUT" : v.stock}
                                  </span>
                                </div>

                                {/* Input */}
                                <input
                                  type="number"
                                  placeholder={updateMode === "add" ? "+qty" : "new"}
                                  value={newStock[varId] || ""}
                                  onChange={(e) =>
                                    setNewStock((prev) => ({
                                      ...prev,
                                      [varId]: e.target.value,
                                    }))
                                  }
                                  disabled={updating === varId}
                                  className="w-full px-2 py-1 border rounded text-sm mb-2 focus:ring-1 focus:ring-blue-300 outline-none disabled:opacity-50"
                                />

                                {/* Button */}
                                <button
                                  onClick={() => updateStock(varId, blank.blank_key, v.stock)}
                                  disabled={updating === varId}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  {updating === varId ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                      <span>...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>{updateMode === "add" ? "➕" : "🔄"}</span>
                                      <span>{updateMode === "add" ? "Add" : "Set"}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
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

