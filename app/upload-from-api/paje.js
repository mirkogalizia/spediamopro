'use client';
import { useState } from 'react';

export default function UploadFromApiPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    setLoading(true);
    setStatus('Importazione in corso...');

    try {
      const res = await fetch('/api/shopify/fetch-all-products', {
        method: 'GET',
      });

      const data = await res.json();

      if (data.ok) {
        setStatus(`✅ Completato: ${data.successCount} prodotti salvati, ${data.errorCount} errori`);
        setResult(data.errors);
      } else {
        setStatus(`❌ Errore: ${data.error}`);
      }
    } catch (err) {
      setStatus(`❌ Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Importa tutti i prodotti Shopify</h1>
      <button
        onClick={handleImport}
        className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
        disabled={loading}
      >
        {loading ? 'Importazione in corso...' : 'Avvia importazione'}
      </button>

      <div className="mt-6">
        <p className="text-sm font-mono whitespace-pre-wrap">{status}</p>
        {result?.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer">Dettagli errori</summary>
            <ul className="list-disc pl-6 mt-2">
              {result.map((e, i) => (
                <li key={i}>🛑 Prodotto ID {e.id}: {e.error}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}