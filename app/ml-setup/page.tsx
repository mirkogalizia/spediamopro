"use client";

import { useState } from "react";

export default function MLSetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function downloadOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ml/import-all-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "shopify" }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Errore durante il download");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-gray-800 mb-8">
          🤖 ML Setup - Data Collection
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">Step 1: Import Ordini Shopify</h2>
          <p className="text-gray-600 mb-6">
            Scarica tutti gli ordini storici da Shopify e salvali su Firebase per
            il training del modello ML.
          </p>

          <button
            onClick={downloadOrders}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Download in corso...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Scarica Tutti gli Ordini</span>
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-800 mb-4">
              ✅ Import Completato!
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Ordini Totali</p>
                <p className="text-2xl font-black text-gray-800">
                  {result.total_orders}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Line Items</p>
                <p className="text-2xl font-black text-gray-800">
                  {result.total_line_items}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Unità Vendute</p>
                <p className="text-2xl font-black text-gray-800">
                  {result.total_units_sold}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Revenue Totale</p>
                <p className="text-2xl font-black text-gray-800">
                  €{result.total_revenue}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Prodotti Unici</p>
                <p className="text-2xl font-black text-gray-800">
                  {result.unique_products}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Periodo</p>
                <p className="text-sm font-semibold text-gray-800">
                  {result.date_range?.from?.split("T")[0]} <br />→{" "}
                  {result.date_range?.to?.split("T")[0]}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
