"use client";

import { useEffect, useState } from "react";

type LogEntry = {
  id: string;
  order_number: string;
  order_id: number;
  processed_at: string;
  total_items: number;
  successful: number;
  errors_count: number;
  results?: any[];
  error_details?: any[];
  critical?: boolean;
};

export default function StockLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [limit, setLimit] = useState(50);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        errors: String(showOnlyErrors),
      });

      const res = await fetch(`/api/admin/stock-logs?${params}`);
      const json = await res.json();
      
      if (json.ok) {
        setLogs(json.logs || []);
        setStats(json.stats || {});
      }
    } catch (err) {
      console.error(err);
      alert("❌ Errore nel caricamento dei log");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, [limit, showOnlyErrors]);

  function toggleLog(logId: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-lg font-semibold text-gray-700 animate-pulse">
          Caricamento log...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">📋</span>
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Stock Logs
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  Storico decrementi automatici da ordini
                </p>
              </div>
            </div>

            <button
              onClick={loadLogs}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl transition-all transform hover:scale-105 flex items-center gap-3"
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
                  Ordini Totali
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.total_orders}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl">
                <p className="text-purple-100 text-sm font-semibold uppercase tracking-wide">
                  Pezzi Scalati
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.total_items_decremented}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-xl">
                <p className="text-green-100 text-sm font-semibold uppercase tracking-wide">
                  Grafiche Aggiornate
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.total_graphics_updated}
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl">
                <p className="text-red-100 text-sm font-semibold uppercase tracking-wide">
                  Errori Totali
                </p>
                <p className="text-5xl font-black text-white mt-2">
                  {stats.total_errors}
                </p>
              </div>
            </div>
          )}

          {/* Filtri */}
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowOnlyErrors(false)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                !showOnlyErrors
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setShowOnlyErrors(true)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                showOnlyErrors
                  ? "bg-red-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Solo Errori
            </button>

            <div className="flex-1"></div>

            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-6 py-3 rounded-xl border-2 border-gray-300 font-bold bg-white"
            >
              <option value="50">Ultimi 50</option>
              <option value="100">Ultimi 100</option>
              <option value="200">Ultimi 200</option>
              <option value="500">Ultimi 500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-10">
        {logs.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-20 text-center">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-3xl font-bold text-gray-800 mb-3">
              Nessun log trovato
            </h3>
            <p className="text-gray-500 text-lg">
              {showOnlyErrors
                ? "Nessun errore registrato"
                : "Non ci sono ancora ordini processati"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const hasErrors = log.errors_count > 0;
              const isCritical = log.critical;

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${
                    isCritical
                      ? "border-red-500"
                      : hasErrors
                      ? "border-yellow-400"
                      : "border-gray-100"
                  }`}
                >
                  {/* Header */}
                  <button
                    onClick={() => toggleLog(log.id)}
                    className={`w-full px-8 py-6 flex items-center gap-6 transition-all ${
                      isCritical
                        ? "bg-red-50 hover:bg-red-100"
                        : hasErrors
                        ? "bg-yellow-50 hover:bg-yellow-100"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                          isCritical
                            ? "bg-red-200"
                            : hasErrors
                            ? "bg-yellow-200"
                            : "bg-green-200"
                        }`}
                      >
                        {isCritical ? "🔥" : hasErrors ? "⚠️" : "✅"}
                      </div>
                    </div>

                    <div className="flex-1 text-left">
                      <h2 className="text-2xl font-black text-gray-800">
                        {isCritical ? "Errore Critico" : `Ordine #${log.order_number}`}
                      </h2>
                      <p className="text-sm text-gray-600 font-medium mt-1">
                        {new Date(log.processed_at).toLocaleString("it-IT", {
                          dateStyle: "full",
                          timeStyle: "medium",
                        })}
                      </p>
                    </div>

                    <div className="flex gap-4 items-center">
                      {!isCritical && (
                        <>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-semibold">
                              Items
                            </p>
                            <p className="text-3xl font-black text-blue-600">
                              {log.total_items}
                            </p>
                          </div>

                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-semibold">
                              Successi
                            </p>
                            <p className="text-3xl font-black text-green-600">
                              {log.successful}
                            </p>
                          </div>

                          {hasErrors && (
                            <div className="text-center">
                              <p className="text-sm text-gray-600 font-semibold">
                                Errori
                              </p>
                              <p className="text-3xl font-black text-red-600">
                                {log.errors_count}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="text-gray-600 text-3xl ml-4">
                        {isExpanded ? "▼" : "▶"}
                      </div>
                    </div>
                  </button>

                  {/* Details */}
                  {isExpanded && (
                    <div className="p-8 border-t-2 border-gray-100">
                      {isCritical ? (
                        <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                          <p className="font-bold text-red-800 mb-2">
                            Errore Critico:
                          </p>
                          <p className="text-red-700 mb-4">{log.error_details}</p>
                          {log.error_details && (
                            <pre className="bg-red-100 p-4 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.error_details, null, 2)}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Results */}
                          {log.results && log.results.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-xl font-bold text-gray-800 mb-4">
                                📦 Items Processati
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {log.results.map((result: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="bg-green-50 rounded-xl p-4 border-2 border-green-200"
                                  >
                                    <p className="font-bold text-gray-800 text-sm mb-2">
                                      {result.order_item}
                                    </p>
                                    <div className="space-y-1 text-xs">
                                      <p className="text-gray-600">
                                        <span className="font-semibold">
                                          Blank:
                                        </span>{" "}
                                        {result.blank_key}
                                      </p>
                                      <p className="text-blue-600 font-bold">
                                        Stock: {result.previous_stock} →{" "}
                                        {result.new_stock} (-
                                        {result.quantity_ordered})
                                      </p>
                                      <p className="text-green-600 font-semibold">
                                        ✅ {result.graphics_updated} grafiche
                                        aggiornate
                                      </p>
                                      {result.graphics_errors_count > 0 && (
                                        <p className="text-red-600 font-semibold">
                                          ❌ {result.graphics_errors_count}{" "}
                                          errori
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Errors */}
                          {log.error_details && log.error_details.length > 0 && (
                            <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                              <h3 className="text-xl font-bold text-red-800 mb-4">
                                ❌ Errori
                              </h3>
                              <div className="space-y-2">
                                {log.error_details.map((error: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="bg-white rounded-lg p-3 border border-red-200"
                                  >
                                    <p className="font-bold text-gray-800 text-sm">
                                      {error.title || "N/A"}
                                    </p>
                                    <p className="text-red-600 text-xs mt-1">
                                      Variant ID: {error.variant_id}
                                    </p>
                                    <p className="text-red-700 text-sm mt-1">
                                      {error.error}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
