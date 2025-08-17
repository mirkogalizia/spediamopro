'use client';

import { useEffect, useState } from 'react';

export default function ShopifyImportPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(0);
  const [nextPageInfo, setNextPageInfo] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // carica page_info da localStorage al primo render
  useEffect(() => {
    const stored = localStorage.getItem('nextPageInfo');
    if (stored) setNextPageInfo(stored);
  }, []);

  async function importProducts() {
    setLoading(true);
    setError(null);
    setSaved(0);

    try {
      let url = '/api/upload';
      if (nextPageInfo) {
        url += `?page_info=${encodeURIComponent(nextPageInfo)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Errore generico');

      setSaved(data.saved);
      setNextPageInfo(data.nextPageInfo || null);

      if (data.nextPageInfo) {
        localStorage.setItem('nextPageInfo', data.nextPageInfo);
      } else {
        localStorage.removeItem('nextPageInfo');
      }

      setLog((prev) => [
        `✅ Salvati ${data.saved} varianti | Prossima page_info: ${data.nextPageInfo || 'fine'}`,
        ...prev,
      ]);
    } catch (e: any) {
      setError(e.message || 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  function resetImport() {
    localStorage.removeItem('nextPageInfo');
    setNextPageInfo(null);
    setLog([]);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">📦 Importa prodotti da Shopify</h1>

      <div className="space-y-4">
        <button
          onClick={importProducts}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          {loading ? 'Importazione in corso...' : 'Importa 10 prodotti'}
        </button>

        <button
          onClick={resetImport}
          className="px-3 py-1 text-sm text-red-500 underline"
        >
          🔄 Resetta importazione
        </button>

        {error && <div className="text-red-500">❌ {error}</div>}
        {saved > 0 && (
          <div className="text-green-600">✅ Salvati: {saved}</div>
        )}

        <div className="text-sm text-gray-600">
          <strong>nextPageInfo:</strong> {nextPageInfo || 'fine'}
        </div>

        <hr />

        <div className="text-sm">
          <h2 className="font-semibold mb-2">📝 Log:</h2>
          <ul className="space-y-1">
            {log.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}