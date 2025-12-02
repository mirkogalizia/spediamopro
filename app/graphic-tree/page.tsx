"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Graphic = {
  variant_id_grafica: number;
  product_id: number;
  product_title: string;
  numero_grafica: number | null;
  size: string;
  color: string;
  image?: string;
};

type BlankVariant = {
  variant_id: number;
  size: string;
  color: string;
  stock: number;
  graphics: Graphic[];
};

type BlankNode = {
  blank: {
    blank_key: string;
    product_id: number;
    name: string;
    total_variants: number;
    image: string | null;
  };
  variants: Record<string, BlankVariant>;
};

type TreeData = Record<string, BlankNode>;

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
  rosso: "bg-red-600",
  blu: "bg-blue-600",
  verde: "bg-green-600",
  giallo: "bg-yellow-400",
  rosa: "bg-pink-400",
  royal: "bg-blue-700",
  viola: "bg-purple-600",
};

export default function GraphicsTreePage() {
  const [tree, setTree] = useState<TreeData>({});
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBlanks, setExpandedBlanks] = useState<Set<string>>(new Set());
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [showOnlyOrphans, setShowOnlyOrphans] = useState(false);

  async function loadTree() {
    setLoading(true);
    try {
      const res = await fetch("/api/shopify2/catalog/graphics-tree");
      const json = await res.json();
      
      if (json.ok) {
        setTree(json.tree);
        setStats(json.stats);
        
        // Espandi tutto di default
        setExpandedBlanks(new Set(Object.keys(json.tree)));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Errore nel caricamento dell'albero");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTree();
  }, []);

  function toggleBlank(blankKey: string) {
    setExpandedBlanks((prev) => {
      const next = new Set(prev);
      if (next.has(blankKey)) {
        next.delete(blankKey);
      } else {
        next.add(blankKey);
      }
      return next;
    });
  }

  function toggleVariant(key: string) {
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-semibold text-gray-700 animate-pulse">
          Caricamento albero prodotti...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🌳</span>
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Albero Associazioni
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  Visualizza la struttura blanks → grafiche
                </p>
              </div>
            </div>

            <button
              onClick={loadTree}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl transition-all transform hover:scale-105 flex items-center gap-3"
            >
              <span className="text-2xl">🔄</span>
              <span>Ricarica</span>
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl">
                <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide">
                  Blanks Totali
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.totalBlanks}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl">
                <p className="text-purple-100 text-sm font-semibold uppercase tracking-wide">
                  Varianti Blanks
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.totalVariants}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-xl">
                <p className="text-green-100 text-sm font-semibold uppercase tracking-wide">
                  Grafiche Totali
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.totalGraphics}
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl">
                <p className="text-red-100 text-sm font-semibold uppercase tracking-wide">
                  Varianti Orfane
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.orphanVariants}
                </p>
              </div>
            </div>
          )}

          {/* Filtro orfani */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowOnlyOrphans(false)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                !showOnlyOrphans
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setShowOnlyOrphans(true)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                showOnlyOrphans
                  ? "bg-red-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Solo Orfani ({stats?.orphanVariants || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-10">
        <div className="space-y-6">
          {Object.entries(tree).map(([blankKey, blankNode]) => {
            const isExpanded = expandedBlanks.has(blankKey);
            
            // Filtra varianti orfane se necessario
            const variantsToShow = Object.entries(blankNode.variants).filter(
              ([_, variant]) => {
                if (showOnlyOrphans) {
                  return variant.graphics.length === 0;
                }
                return true;
              }
            );

            if (variantsToShow.length === 0 && showOnlyOrphans) return null;

            return (
              <div
                key={blankKey}
                className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-100"
              >
                {/* Blank Header */}
                <button
                  onClick={() => toggleBlank(blankKey)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex items-center gap-6 hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {blankNode.blank.image ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                      <Image
                        src={blankNode.blank.image}
                        alt={blankNode.blank.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-4xl">👕</span>
                    </div>
                  )}

                  <div className="flex-1 text-left">
                    <h2 className="text-3xl font-black text-white capitalize">
                      {blankKey.replaceAll("_", " ")}
                    </h2>
                    <p className="text-indigo-100 text-sm mt-1 font-semibold">
                      {blankNode.blank.total_variants} varianti
                    </p>
                  </div>

                  <div className="text-white text-3xl transform transition-transform">
                    {isExpanded ? "▼" : "▶"}
                  </div>
                </button>

                {/* Variants */}
                {isExpanded && (
                  <div className="p-8 space-y-6">
                    {variantsToShow.map(([variantKey, variant]) => {
                      const fullKey = `${blankKey}-${variantKey}`;
                      const isVariantExpanded = expandedVariants.has(fullKey);
                      const hasGraphics = variant.graphics.length > 0;

                      return (
                        <div
                          key={variantKey}
                          className={`rounded-2xl border-2 overflow-hidden ${
                            hasGraphics
                              ? "border-green-300 bg-green-50"
                              : "border-red-300 bg-red-50"
                          }`}
                        >
                          {/* Variant Header */}
                          <button
                            onClick={() => toggleVariant(fullKey)}
                            className={`w-full px-6 py-4 flex items-center gap-4 transition-all ${
                              hasGraphics
                                ? "bg-green-100 hover:bg-green-200"
                                : "bg-red-100 hover:bg-red-200"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full ${
                                COLOR_DOTS[variant.color] || "bg-gray-400"
                              }`}
                            />
                            
                            <div className="flex-1 text-left">
                              <p className="text-xl font-bold text-gray-800">
                                {variant.size.toUpperCase()} - {variant.color}
                              </p>
                              <p className="text-sm text-gray-600">
                                Stock: <span className="font-bold">{variant.stock}</span> | 
                                Grafiche: <span className="font-bold">{variant.graphics.length}</span>
                              </p>
                            </div>

                            <div className="text-gray-600 text-2xl">
                              {isVariantExpanded ? "▼" : "▶"}
                            </div>
                          </button>

                          {/* Graphics */}
                          {isVariantExpanded && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {variant.graphics.length === 0 ? (
                                <div className="col-span-full text-center py-8">
                                  <div className="text-6xl mb-3">⚠️</div>
                                  <p className="text-lg font-bold text-red-600">
                                    Nessuna grafica associata
                                  </p>
                                </div>
                              ) : (
                                variant.graphics.map((graphic) => (
                                  <div
                                    key={graphic.variant_id_grafica}
                                    className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-xl transition-all transform hover:scale-105"
                                  >
                                    {graphic.image ? (
                                      <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3">
                                        <Image
                                          src={graphic.image}
                                          alt={graphic.product_title}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                                        <span className="text-5xl">🎨</span>
                                      </div>
                                    )}

                                    <p className="font-bold text-gray-800 text-sm truncate mb-1">
                                      {graphic.product_title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ID: {graphic.variant_id_grafica}
                                    </p>
                                    {graphic.numero_grafica && (
                                      <span className="inline-block mt-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                        #{graphic.numero_grafica}
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
