'use client';
import Papa from 'papaparse';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { Button, Typography, Input } from '@mui/material';

export default function UploadVariants() {
  const [status, setStatus] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        setStatus(`📦 ${rows.length} righe lette, sto caricando...`);
        console.log("Parsed rows:", rows);

        let ok = 0;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            const docId = row["ID"] || `${Date.now()}-${i}`;
            await setDoc(doc(collection(db, 'shopify_variants'), docId), {
              title: row["Titolo"] || '',
              sku: row["SKU"] || '',
              colore: row["Colore"] || '',
              taglia: row["Taglia"] || '',
              inventory_quantity: parseInt(row["Quantità"] || '0'),
              image: row["Immagine"] || '',
              numero_grafica: row["Numero grafica"] || '',
              online: row["Online"]?.toLowerCase() === 'true',
              timestamp: new Date()
            });
            ok++;
          } catch (err) {
            console.error(`❌ Errore alla riga ${i}:`, err);
          }
        }

        setStatus(`✅ ${ok} righe caricate su Firestore`);
      },
      error: (error) => {
        console.error("Errore parsing CSV:", error);
        setStatus("❌ Errore durante il parsing del CSV");
      }
    });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Input type="file" accept=".csv" onChange={handleFileUpload} />
      <Typography variant="body1" style={{ marginTop: '1rem' }}>
        {status}
      </Typography>
    </div>
  );
}