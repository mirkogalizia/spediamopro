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
  const [updating, setUpdating] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<Record<string, string>>({});
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
    if (!confirm("🔄 Scaricare lo stock aggiornato da Shopify?\n\nQuesta operazione aggiornerà i dati dei blanks.")) {
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/shopify2/catalog/build-blanks-stock");
      const json = await res.json();
      
      if (json.ok) {
        alert(`✅ Sincronizzazione completata!\n\n📦 ${json.processed.length} blanks aggiornati`);
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

  async function updateStock(variantId: string, blankKey: string, currentStock: number) {
    const value = Number(newStock[variantId]);

    if (!newStock[variantId] || isNaN(value)) {
      alert("❌ Inserisci un numero valido");
      return;
    }

    const finalStock = updateMode === "add" ? currentStock + value : value;
    const confirmMsg = updateMode === "add" 
      ? `➕ Aggiungere ${value} unità?\n\n📦 Stock attuale: ${currentStock}\n📦 Nuovo stock: ${finalStock}\n\n⚡ Le grafiche associate verranno aggiornate automaticamente.`
      : `🔄 Impostare stock a ${value}?\n\n📦 Stock attuale: ${currentStock}\n\n⚡ Le grafiche associate verranno aggiornate automaticamente.`;

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
        const successMsg = [
          `✅ Aggiornamento completato!`,
          ``,
          `📦 Stock: ${json.previous_stock} → ${json.new_stock}`,
          `🎨 Grafiche aggiornate: ${json.graphics_updated}`,
          json.graphics_errors > 0 ? `⚠️ Errori: ${json.graphics_errors}` : null,
        ].filter(Boolean).join('\n');
        
        alert(successMsg);
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        <p className="text-lg font-semibold text-gray-700 animate-pulse">Caricamento stock...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">📦</span>
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Stock Blanks
                </h1>
                <p className="text-gray-600 mt-1 font-medium">Gestione inventario prodotti base</p>
              </div>
            </div>

            <button
              onClick={syncFromShopify}
              disabled={syncing}
              className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
            >
              {syncing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sincronizzazione...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">🔄</span>
                  <span>Scarica da Shopify</span>
                </>
              )}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide">
                    Varianti Totali
                  </p>
                  <p className="text-5xl font-black text-white mt-2">
                    {stats.total}
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-xl transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-semibold uppercase tracking-wide">
                    Stock Basso (1-5)
                  </p>
                  <p className="text-5xl font-black text-white mt-2">
                    {stats.lowStock}
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">⚠️</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-semibold uppercase tracking-wide">
                    Esauriti (≤ 0)
                  </p>
                  <p className="text-5xl font-black text-white mt-2">
                    {stats.outOfStock}
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">🚫</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modalità Update */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-bold uppercase tracking-wide mb-2">
                  Modalità Aggiornamento
                </p>
                <p className="text-purple-50 text-sm">
                  {updateMode === "set" 
                    ? "🔄 Il valore sostituirà lo stock attuale" 
                    : "➕ Il valore verrà sommato allo stock attuale"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setUpdateMode("set")}
                  className={`px-6 py-3 rounded-xl font-bold transition-all transform ${
                    updateMode === "set"
                      ? "bg-white text-purple-600 shadow-lg scale-105"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  🔄 Sostituisci
                </button>
                <button
                  onClick={() => setUpdateMode("add")}
                  className={`px-6 py-3 rounded-xl font-bold transition-all transform ${
                    updateMode === "add"
                      ? "bg-white text-purple-600 shadow-lg scale-105"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  ➕ Somma
                </button>
              </div>
            </div>
          </div>

          {/* Filtri */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</div>
              <input
                type="text"
                placeholder="Cerca per categoria, colore o taglia..."
                value={search}
                onChange={(e) => setSearch(e.target.value.toLowerCase())}
                className="w-full pl-14 pr-6 py-4 bg-white border-2 border-gray-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all shadow-md"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setFilterStock("all")}
                className={`px-8 py-4 rounded-2xl font-bold transition-all transform shadow-lg ${
                  filterStock === "all"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilterStock("low")}
                className={`px-8 py-4 rounded-2xl font-bold transition-all transform shadow-lg ${
                  filterStock === "low"
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Stock Basso
              </button>
              <button
                onClick={() => setFilterStock("out")}
                className={`px-8 py-4 rounded-2xl font-bold transition-all transform shadow-lg ${
                  filterStock === "out"
                    ? "bg-gradient-to-r from-red-500 to-pink-600 text-white scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Esauriti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-10">
        {filteredBlanks.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-20 text-center">
            <div className="text-8xl mb-6">🔍</div>
            <h3 className="text-3xl font-bold text-gray-800 mb-3">
              Nessun risultato trovato
            </h3>
            <p className="text-gray-500 text-lg">
              Prova a modificare i filtri di ricerca
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredBlanks.map((blank) => {
              const grouped: Record<string, Variant[]> = {};
              blank.inventory.forEach((v) => {
                if (!grouped[v.colore]) grouped[v.colore] = [];
                grouped[v.colore].push(v);
              });

              return (
                <div
                  key={blank.blank_key}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-100"
                >
                  <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-8 py-6">
                    <h2 className="text-3xl font-black text-white capitalize flex items-center gap-3">
                      <span className="text-4xl">👕</span>
                      {blank.blank_key.replaceAll("_", " ")}
                    </h2>
                    <p className="text-blue-100 text-sm mt-2 font-semibold">
                      {blank.inventory.length} varianti disponibili
                    </p>
                  </div>

                  <div className="p-8">
                    {Object.entries(grouped).map(([colore, variants], idx) => (
                      <div key={colore} className={idx > 0 ? "mt-10 pt-10 border-t-2 border-gray-100" : ""}>
                        <div className="flex items-center gap-4 mb-6">
                          <div
                            className={`w-10 h-10 rounded-full shadow-lg ${
                              COLOR_DOTS[colore] || "bg-gray-400"
                            }`}
                          />
                          <h3 className="text-2xl font-black capitalize text-gray-800">
                            {colore}
                          </h3>
                          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                            {variants.length} varianti
                          </span>
                        </div>

                        {/* Scroll orizzontale */}
                        <div className="relative">
                          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {variants.map((v) => (
                              <div
                                key={v.id}
                                className={`flex-shrink-0 w-72 rounded-2xl border-3 p-6 transition-all transform hover:scale-105 hover:shadow-2xl ${
                                  v.stock <= 0
                                    ? "border-red-400 bg-gradient-to-br from-red-50 to-red-100"
                                    : v.stock <= 5
                                    ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50"
                                    : "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-4xl font-black text-gray-800">
                                    {v.taglia}
                                  </span>
                                  <span
                                    className={`px-4 py-2 rounded-xl text-base font-black shadow-lg ${
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

                                <div className="h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent my-4"></div>

                                <div className="space-y-3">
                                  <input
                                    type="number"
                                    placeholder={updateMode === "add" ? "Quantità..." : "Nuovo stock..."}
                                    value={newStock[v.id] || ""}
                                    onChange={(e) =>
                                      setNewStock((prev) => ({
                                        ...prev,
                                        [v.id]: e.target.value,
                                      }))
                                    }
                                    disabled={updating === v.id}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none font-semibold text-lg transition-all disabled:opacity-50"
                                  />
                                  <button
                                    onClick={() =>
                                      updateStock(v.id, blank.blank_key, v.stock)
                                    }
                                    disabled={updating === v.id}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                  >
                                    {updating === v.id ? (
                                      <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Aggiornamento...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-xl">
                                          {updateMode === "add" ? "➕" : "🔄"}
                                        </span>
                                        <span>{updateMode === "add" ? "Aggiungi" : "Aggiorna"}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
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
