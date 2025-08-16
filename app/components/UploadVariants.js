'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function UploadVariants() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStatus('⏳ Caricamento in corso...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const parsedData = results.data;
        let successCount = 0;

        for (let row of parsedData) {
          const variant_id = row["Variant ID"]?.toString().trim();
          if (!variant_id) continue;

          const data = {
            variant_id,
            title: row["Title"]?.trim() || "",
            taglia: row["Option1 Value"]?.trim() || "",
            colore: row["Option2 Value"]?.trim() || "",
            image: row["Image Src"]?.trim() || "",
            inventory_quantity: Number(row["Variant Inventory Qty"] || 0),
            sku: row["Variant SKU"]?.trim() || "",
            numero_grafica: row["Handle"]?.trim() || "",
            online: (row["Published"] || "").trim().toLowerCase() === "true",
            timestamp: new Date(),
          };

          try {
            await setDoc(doc(db, "variants", variant_id), data);
            successCount++;
          } catch (err) {
            console.error("❌ Errore durante il salvataggio:", err, data);
          }
        }

        setLoading(false);
        setStatus(`✅ ${successCount} varianti caricate su Firebase.`);
      },
    });
  };

  return (
    <div className="flex flex-col items-center text-center">
      <label
        htmlFor="csvUpload"
        className="px-6 py-3 bg-black text-white rounded-lg cursor-pointer hover:bg-gray-800 transition"
      >
        📤 Seleziona file CSV
      </label>
      <input
        id="csvUpload"
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      {loading && <p className="mt-4 text-gray-600">Caricamento in corso...</p>}
      {status && <p className="mt-4 text-lg font-medium">{status}</p>}
    </div>
  );
}