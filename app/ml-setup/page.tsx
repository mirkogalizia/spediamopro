"use client";

import { useState } from "react";

export default function MLSetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [existingCount, setExistingCount] = useState<number | null>(null);

  async function checkExisting() {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/ml/import-all-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "count" }),
      });
      const data = await res.json();
      setExistingCount(data.existing_records);
    } catch (err) {
      console.error(err);
    }
    setChecking(false);
  }

  async function downloadOrders() {
    if (!confirm("⚠️ Questo scaricherà TUTTI gli ordini. Procedere?\n\nTempo stimato: 10-60 minuti")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/ml/import-all-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "shopify" }),
      });

      const data = await res.json();
      setResult(data);
      
      if (data.ok) {
        alert(`✅ Import completato!\n\n${data.total_orders_downloaded} ordini scaricati\n${data.total_line_items} line items salvati`);
      } else {
        alert(`❌ Errore: ${data.error}`);
      }
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

        {/* Check Status */}
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-800 mb-3">
            📊 Verifica Dati Esistenti
          </h2>
          <button
            onClick={checkExisting}
            disabled={checking}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
          >
            {checking ? "Controllo..." : "Controlla Database"}
          </button>

          {existingCount !== null && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-2xl font-black text-gray-800">
                {existingCount.toLocaleString()} records
              </p>
              <p className="text-sm text-gray-600">già salvati in Firebase</p>
            </div>
          )}
        </div>

        {/* Import Button */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">Step 1: Import Ordini Shopify</h2>
          <p className="text-gray-600 mb-6">
            Scarica <strong>TUTTI</strong> gli ordini storici da Shopify (nessun limite).
            Il sistema scaricherà ordini in batch da 250 fino al primo ordine mai fatto.
          </p>

          <button
            onClick={downloadOrders}
            disabled={loading}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-bold disabled:opacity-50 flex items-center gap-3 text-lg shadow-xl"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Download in corso...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📥</span>
                <span>Scarica TUTTI gli Ordini</span>
              </>
            )}
          </button>

          {loading && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 font-semibold">
                ⏳ Questo processo può richiedere 10-60 minuti.
                <br />
                Puoi chiudere questa pagina, il processo continuerà in background.
                <br />
                Controlla i log su Vercel per il progresso.
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className={`${result.ok ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-2 rounded-lg p-6`}>
            {result.ok ? (
              <>
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">✅</span>
                  Import Completato!
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Ordini su Shopify</p>
                    <p className="text-3xl font-black text-gray-800">
                      {result.total_orders_shopify}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Ordini Scaricati</p>
                    <p className="text-3xl font-black text-blue-600">
                      {result.total_orders_downloaded}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Coverage</p>
                    <p className="text-3xl font-black text-green-600">
                      {result.coverage_percentage}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Line Items</p>
                    <p className="text-3xl font-black text-gray-800">
                      {result.total_line_items}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Unità Vendute</p>
                    <p className="text-3xl font-black text-gray-800">
                      {result.total_units_sold}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Revenue Totale</p>
                    <p className="text-3xl font-black text-gray-800">
                      €{result.total_revenue}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Prodotti Unici</p>
                    <p className="text-3xl font-black text-gray-800">
                      {result.unique_products}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600">Periodo</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {result.date_range?.from?.split("T")[0]} <br />
                      → {result.date_range?.to?.split("T")[0]}
                    </p>
                  </div>
                </div>

                {parseFloat(result.coverage_percentage) < 100 && (
                  <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                    <p className="text-yellow-800 font-semibold">
                      ⚠️ Coverage non al 100%. Potrebbero esserci ordini mancanti.
                      Lancia di nuovo l'import per completare.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  ❌ Errore Import
                </h3>
                <p className="text-red-600">{result.error}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
