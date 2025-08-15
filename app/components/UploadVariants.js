"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { collection, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UploadVariants() {
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus("⏳ Caricamento in corso...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const data = results.data;
        let count = 0;

        for (const row of data) {
          if (row["Variant ID"]) {
            const docRef = doc(db, "variants", row["Variant ID"]);
            await setDoc(docRef, {
              title: row["Title"],
              option1: row["Option1 Value"],
              option2: row["Option2 Value"],
              variantId: row["Variant ID"],
              sku: row["Variant SKU"],
            });
            count++;
          }
        }

        setUploadStatus(`✅ ${count} righe caricate.`);
      },
      error: function (error) {
        console.error("Errore durante il parsing:", error);
        setUploadStatus("❌ Errore durante il caricamento.");
      },
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50 p-4">
      <div className="max-w-md w-full bg-white border border-black shadow-lg rounded-xl p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Upload Varianti CSV</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-700
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-black file:text-white
                     hover:file:bg-gray-700"
        />
        {uploadStatus && (
          <p className="mt-4 text-base font-medium">{uploadStatus}</p>
        )}
      </div>
    </div>
  );
}