'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function UploadVariants() {
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const data = results.data;
        let count = 0;

        for (const row of data) {
          try {
            await addDoc(collection(db, 'variants'), row);
            count++;
          } catch (error) {
            console.error('Errore nel salvataggio:', error);
          }
        }

        setUploadStatus(`✅ ${count} righe caricate.`);
      },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Upload Varianti CSV</h1>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block mx-auto text-sm"
        />
        {uploadStatus && <p className="text-green-600 font-semibold">{uploadStatus}</p>}
      </div>
    </div>
  );
}