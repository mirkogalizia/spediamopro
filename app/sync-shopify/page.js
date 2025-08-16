'use client';
import { useState } from 'react';

export default function SyncShopifyPage() {
  const [status, setStatus] = useState("Inattivo");
  const [success, setSuccess] = useState(0);
  const [failed, setFailed] = useState(0);
  const [errors, setErrors] = useState([]);

  const handleSync = async () => {
    setStatus("🔄 Sincronizzazione in corso...");
    setSuccess(0);
    setFailed(0);
    setErrors([]);

    try {
      const res = await fetch("/api/sync-variants");
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.success);
        setFailed(data.failed);
        setErrors(data.errors || []);
        setStatus("✅ Sincronizzazione completata!");
      } else {
        setStatus(`❌ Errore: ${data.error}`);
      }
    } catch (e) {
      setStatus(`❌ Errore: ${e.message}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">🔁 Sync Varianti da Shopify</h1>
      <button
        onClick={handleSync}
        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
      >
        Avvia Sincronizzazione
      </button>

      <p className="mt-4 text-lg">{status}</p>
      {success > 0 && (
        <p className="mt-2 text-green-600">✅ Varianti salvate: {success}</p>
      )}
      {failed > 0 && (
        <div className="mt-2 text-red-600">
          ❌ Fallite: {failed}
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer underline">Dettagli errori</summary>
            <ul className="text-left mt-2">
              {errors.map((err, i) => (
                <li key={i}>
                  <strong>{err.variant_id}:</strong> {err.error}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}