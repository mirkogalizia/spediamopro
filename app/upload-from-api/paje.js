'use client';
import { useState } from 'react';

export default function UploadFromAPIPage() {
  const [status, setStatus] = useState("In attesa...");
  const [errors, setErrors] = useState([]);

  const handleImport = async () => {
    setStatus("⏳ Importazione in corso...");
    try {
      const res = await fetch('/api/shopify/fetch-all-products');
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message);
        setErrors(data.errors || []);
      } else {
        setStatus(`❌ Errore: ${data.error}`);
      }
    } catch (err) {
      setStatus(`❌ Errore: ${err.message}`);
    }
  };

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Importa prodotti da Shopify</h1>
      <button onClick={handleImport} className="bg-black text-white px-6 py-3 rounded-lg">
        Avvia Import
      </button>
      <p className="mt-4">{status}</p>

      {errors.length > 0 && (
        <div className="mt-6 text-left">
          <h2 className="text-red-600 font-bold">❌ Errori:</h2>
          <ul className="text-sm text-gray-700 max-h-64 overflow-y-auto">
            {errors.map((e, i) => (
              <li key={i}>{e.variant_id}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}