"use client";

import { useEffect, useState, useMemo } from "react";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState<any>(null);
  const [newStock, setNewStock] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
      const json = await res.json();
      setData(json.blanks || []);
      setLoading(false);
    }
    load();
  }, []);

  function openModal(v: any) {
    setCurrentVariant(v);
    setNewStock(String(v.stock));
    setModalOpen(true);
  }

  async function updateStock() {
    if (!currentVariant) return;

    const res = await fetch("/api/shopify2/catalog/update-blank-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blank_key: currentVariant.blank_key,
        variant_id: currentVariant.variant_id,
        stock: Number(newStock),
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      alert("Errore aggiornamento stock: " + json.error);
      return;
    }

    setModalOpen(false);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-lg text-gray-600">
        Caricamento...
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-10">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">📦 Stock Blanks</h1>

      {data.map((blank) => {
        const groupedByColor: Record<string, any[]> = {};

        blank.inventory.forEach((v: any) => {
          if (!groupedByColor[v.colore]) groupedByColor[v.colore] = [];
          groupedByColor[v.colore].push({
            ...v,
            blank_key: blank.blank_key,
          });
        });

        Object.keys(groupedByColor).forEach((c) => {
          groupedByColor[c].sort((a: any, b: any) => {
            return (
              SIZE_ORDER.indexOf(a.taglia.toUpperCase()) -
              SIZE_ORDER.indexOf(b.taglia.toUpperCase())
            );
          });
        });

        return (
          <div
            key={blank.blank_key}
            className="mb-10 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <h2 className="text-2xl font-bold capitalize">
                {blank.blank_key.replaceAll("_", " ")}
              </h2>
              <p className="text-blue-100 text-sm">
                {blank.inventory.length} varianti
              </p>
            </div>

            <div className="p-6 space-y-8">
              {Object.entries(groupedByColor).map(([colore, variants]) => (
                <div key={colore}>
                  <div className="flex items-center mb-3">
                    <div
                      className="w-5 h-5 rounded-full mr-3 shadow"
                      style={{
                        backgroundColor: COLOR_MAP[colore] || "#CCC",
                      }}
                    ></div>
                    <h3 className="text-xl font-semibold capitalize">
                      {colore}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {variants.map((v: any) => (
                      <div
                        key={v.id}
                        className="bg-gray-50 border rounded-xl p-4 text-center shadow-sm hover:shadow-md transition"
                      >
                        <div className="text-lg font-bold">{v.taglia}</div>

                        <div
                          className={`mt-2 px-3 py-1 text-sm font-bold rounded-lg ${
                            v.stock === 0
                              ? "bg-red-500 text-white"
                              : v.stock <= 5
                              ? "bg-yellow-500 text-white"
                              : "bg-green-500 text-white"
                          }`}
                        >
                          {v.stock}
                        </div>

                        <button
                          onClick={() => openModal(v)}
                          className="mt-3 text-xs text-blue-600 font-semibold underline"
                        >
                          Modifica
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

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
            <h3 className="text-xl font-bold mb-4">Modifica Stock</h3>

            <p className="text-sm text-gray-700 mb-3">
              <span className="font-semibold">Taglia:</span> {currentVariant.taglia} <br />
              <span className="font-semibold">Colore:</span> {currentVariant.colore}
            </p>

            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 mb-4"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
            />

            <button
              onClick={updateStock}
              className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold mb-2"
            >
              Aggiorna
            </button>

            <button
              onClick={() => setModalOpen(false)}
              className="w-full bg-gray-200 py-2 rounded-xl font-semibold"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}