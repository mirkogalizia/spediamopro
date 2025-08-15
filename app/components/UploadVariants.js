"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { db } from '../../lib/firebase';
import { collection, setDoc, doc } from "firebase/firestore";

export default function UploadVariants() {
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState([]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        setRows(data);
        setUploading(true);

        for (const row of data) {
          if (row["Variant ID"]) {
            const variantId = row["Variant ID"].trim();
            await setDoc(doc(collection(db, "variants_cache"), variantId), row);
          }
        }

        setUploading(false);
        alert("✅ Dati caricati correttamente su Firestore!");
      },
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Varianti CSV</h2>
      <input type="file" accept=".csv" onChange={handleFile} />
      {uploading && <p>⏳ Caricamento in corso...</p>}
      {!uploading && rows.length > 0 && <p>✅ {rows.length} righe caricate.</p>}
    </div>
  );
}