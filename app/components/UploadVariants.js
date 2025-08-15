"use client";

import { useState } from "react";
import Papa from "papaparse";
import { db } from "@/lib/firebase";
import { collection, setDoc, doc } from "firebase/firestore";

export default function UploadVariants() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setResult("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;

        for (const row of results.data) {
          if (!row["Variant ID"]) continue;

          try {
            const id = row["Variant ID"].toString();
            await setDoc(doc(db, "variants", id), {
              variant_id: id,
              title: row["Title"],
              option1: row["Option1 Value"],
              option2: row["Option2 Value"],
              sku: row["Variant SKU"],
              price: row["Variant Price"],
              image: row["Image Src"],
            });
            successCount++;
          } catch (err) {
            console.error("Errore su variante:", row, err);
          }
        }

        setResult(`✅ ${successCount} righe caricate.`);
        setLoading(false);
      },
    });
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-md w-full max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Upload Varianti CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {loading && <p className="mt-4 text-blue-500">Caricamento in corso...</p>}
      {result && <p className="mt-4 text-green-600">{result}</p>}
    </div>
  );
}