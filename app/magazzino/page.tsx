// app/magazzino/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Package, RefreshCw, Search, TrendingUp, AlertTriangle, XCircle, Plus, ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import Link from "next/link";

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
    if (!confirm("🔄 Scaricare lo stock aggiornato da Shopify?")) return;

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
      <div className="relative min-h-screen">
        {/* Background magazzino */}
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070')",
              filter: 'brightness(0.3) contrast(1.1)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-gray-900/50 to-slate-800/60" />
        </div>
        
        <Sidebar />
        
        <div className="relative z-10 ml-0 lg:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-semibold">Caricamento stock...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background magazzino */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070')",
            filter: 'brightness(0.3) contrast(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-gray-900/50 to-slate-800/60" />
      </div>

      <Sidebar />

      <div className="relative z-10 ml-0 lg:ml-64 min-h-screen p-6 lg:p-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="p-2.5 rounded-xl bg-white/30 hover:bg-white/50 backdrop-blur-xl border border-white/40 transition-all">
                  <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
                </button>
              </Link>
              
              <div className="bg-white/60 backdrop-blur-2xl rounded-full px-6 py-3 shadow-xl border border-white/40">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-6 h-6" strokeWidth={2} />
                  Stock Magazzino
                </h1>
              </div>
            </div>

            <button
              onClick={syncFromShopify}
              disabled={syncing}
              className="bg-white/60 hover:bg-white/80 backdrop-blur-2xl text-slate-800 px-5 py-3 rounded-xl font-bold border border-white/40 shadow-xl disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={2} />
              {syncing ? 'Sincronizzazione...' : 'Sync Shopify'}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/40 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/80 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Totali</p>
                  <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/40 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/80 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Stock Basso</p>
                  <p className="text-3xl font-black text-slate-900">{stats.lowStock}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/40 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/80 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Esauriti</p>
                  <p className="text-3xl font-black text-slate-900">{stats.outOfStock}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filtri */}
          <div className="bg-white/40 backdrop-blur-2xl rounded-2xl p-4 shadow-xl border border-white/30">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Ricerca */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Cerca per modello, colore o taglia..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value.toLowerCase())}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              {/* Modalità Update */}
              <div className="flex gap-2 bg-slate-800/60 backdrop-blur-xl rounded-xl p-1 border border-slate-700/50">
                <button
                  onClick={() => setUpdateMode("set")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    updateMode === "set"
                      ? "bg-white text-slate-800 shadow-lg"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  🔄 Sostituisci
                </button>
                <button
                  onClick={() => setUpdateMode("add")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    updateMode === "add"
                      ? "bg-white text-slate-800 shadow-lg"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  ➕ Aggiungi
                </button>
              </div>

              {/* Filtri Stock */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStock("all")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    filterStock === "all"
                      ? "bg-white text-slate-800 shadow-lg"
                      : "bg-white/30 text-white hover:bg-white/50"
                  } backdrop-blur-xl border border-white/40`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setFilterStock("low")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    filterStock === "low"
                      ? "bg-yellow-500 text-white shadow-lg"
                      : "bg-white/30 text-white hover:bg-white/50"
                  } backdrop-blur-xl border border-white/40`}
                >
                  Bassi
                </button>
                <button
                  onClick={() => setFilterStock("out")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    filterStock === "out"
                      ? "bg-red-500 text-white shadow-lg"
                      : "bg-white/30 text-white hover:bg-white/50"
                  } backdrop-blur-xl border border-white/40`}
                >
                  Esauriti
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {filteredBlanks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/40 backdrop-blur-2xl rounded-3xl p-12 text-center shadow-xl border border-white/30"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Nessun risultato</h3>
            <p className="text-slate-600">Prova a modificare i filtri di ricerca</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredBlanks.map((blank, index) => {
              const grouped: Record<string, Variant[]> = {};
              blank.inventory.forEach((v) => {
                if (!grouped[v.colore]) grouped[v.colore] = [];
                grouped[v.colore].push(v);
              });

              return (
                <motion.div
                  key={blank.blank_key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/40 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/30 overflow-hidden"
                >
                  {/* Header Blank */}
                  <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl px-5 py-3 border-b border-white/20">
                    <h2 className="text-lg font-black text-white capitalize flex items-center gap-2">
                      <span className="text-xl">👕</span>
                      {blank.blank_key.replaceAll("_", " ")}
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xl">
                        {blank.inventory.length} varianti
                      </span>
                    </h2>
                  </div>

                  {/* Varianti per Colore */}
                  <div className="p-5">
                    {Object.entries(grouped).map(([colore, variants], idx) => (
                      <div key={colore} className={idx > 0 ? "mt-6 pt-6 border-t border-white/20" : ""}>
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className={`w-8 h-8 rounded-full shadow-lg ${
                              COLOR_DOTS[colore] || "bg-gray-400"
                            }`}
                          />
                          <h3 className="text-base font-bold capitalize text-slate-900">{colore}</h3>
                          <span className="text-xs bg-slate-800/60 text-white px-2 py-1 rounded-full font-semibold backdrop-blur-xl">
                            {variants.length}
                          </span>
                        </div>

                        {/* Grid Varianti */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                          {variants.map((v) => {
                            const varId = v.variant_id || 0;
                            return (
                              <div
                                key={v.id}
                                className={`border-2 rounded-xl p-3 backdrop-blur-xl shadow-lg ${
                                  v.stock <= 0
                                    ? "border-red-400/60 bg-red-50/60"
                                    : v.stock <= 5
                                    ? "border-yellow-400/60 bg-yellow-50/60"
                                    : "border-green-400/60 bg-green-50/60"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xl font-black text-slate-900">{v.taglia}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-xs font-black ${
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
                                  className="w-full px-3 py-2 bg-white/80 backdrop-blur-xl border border-white/40 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-slate-300 outline-none disabled:opacity-50"
                                />

                                <button
                                  onClick={() => updateStock(varId, blank.blank_key, v.stock)}
                                  disabled={updating === varId}
                                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1 transition-all shadow-lg"
                                >
                                  {updating === varId ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                      <span>...</span>
                                    </>
                                  ) : (
                                    <>
                                      {updateMode === "add" ? (
                                        <Plus className="w-3 h-3" strokeWidth={3} />
                                      ) : (
                                        <RefreshCw className="w-3 h-3" strokeWidth={3} />
                                      )}
                                      <span>{updateMode === "add" ? "Aggiungi" : "Imposta"}</span>
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
