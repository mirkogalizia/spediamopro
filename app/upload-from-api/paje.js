'use client';

import { useState } from 'react';

export default function UploadFromAPIPage() {
  const [status, setStatus] = useState("⏳ In attesa...");
  const [errors, setErrors] = useState([]);

  const startImport = async () => {
    setStatus("🚀 Import in corso...");
    try {
      const res = await fetch('/api/shopify/fetch-all-products');
      const json = await res.json();

      if (!res.ok) {
        setStatus(`❌ Errore: ${json.error}`);
        return;
      }

      setStatus(json.message);
      setErrors(json.errors || []);
    } catch (err) {
      setStatus(`❌ Errore rete: ${err.message}`);
    }
  };

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold mb-6">Importa prodotti da Shopify</h1>
      <button onClick={startImport} className="bg-black text-white px-6 py-3 rounded-lg">
        Inizia Import
      </button>
      <p className="mt-4">{status}</p>

      {errors.length > 0 && (
        <div className="mt-6 text-left max-w-3xl mx-auto">
          <h2 className="text-red-600 font-bold">Errori:</h2>
          <ul className="text-sm max-h-80 overflow-y-auto bg-red-100 p-4 rounded-md">
            {errors.map((e, i) => (
              <li key={i} className="mb-1">🔴 {e.variant_id} - {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}