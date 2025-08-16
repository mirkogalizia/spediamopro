"use client";

import { useState } from "react";
import { parseAndUploadVariants } from "./parseAndUploadVariants";

export default function UploadVariants() {
  const [status, setStatus] = useState("");

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("⏳ Upload in corso...");
    try {
      const result = await parseAndUploadVariants(file);
      setStatus(`✅ ${result.total} righe caricate correttamente.`);
    } catch (error) {
      console.error(error);
      setStatus("❌ Errore durante l'upload.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-xl font-bold mb-4">Upload Varianti Shopify</h1>
      <input
        type="file"
        accept=".csv"
        onChange={handleUpload}
        className="border p-2 rounded"
      />
      <p className="mt-4">{status}</p>
    </div>
  );
}