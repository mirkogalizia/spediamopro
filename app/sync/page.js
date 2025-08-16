'use client';

import { useState } from "react";

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState(null);
  const [error, setError] = useState(null);

  const handleSync = async () => {
    setLoading(true);
    setLog(null);
    setError(null);

    try {
      const res = await fetch('/api/sync-shopify-variants');
      if (!res.ok) throw new Error("Errore nella chiamata API");

      const data = await res.json();
      setLog(data);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">🔁 Sincronizza Varianti da Shopify</h1>

      <button
        onClick={handleSync}
        disabled={loading}
        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? '⏳ Sincronizzazione in corso...' : '🚀 Avvia Sincronizzazione'}
      </button>

      {log && (
        <div className="mt-8 w-full max-w-4xl bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">✅ Risultato:</h2>
          <p>✅ Varianti salvate: <strong>{log.successCount}</strong></p>
          <p>❌ Errori: <strong>{log.errorCount}</strong></p>

          {log.errors?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold text-red-600">Dettaglio errori:</h3>
              <ul className="mt-2 text-sm max-h-80 overflow-y-auto space-y-1 bg-red-50 p-4 rounded border border-red-300">
                {log.errors.map((e, index) => (
                  <li key={index} className="break-words">
                    <span className="font-mono text-gray-700">{e.variant_id}</span>: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-6 text-red-600 font-bold">{error}</p>
      )}
    </div>
  );
}