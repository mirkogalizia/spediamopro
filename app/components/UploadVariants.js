"use client";

import { useState } from "react";
import { Button, Typography } from "@mui/material";
import Papa from "papaparse";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function UploadVariants() {
  const [status, setStatus] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const parsedData = results.data;
        let successCount = 0;

        for (let row of parsedData) {
          const variant_id = row["Variant ID"]?.toString()?.trim();
          if (!variant_id) continue;

          const data = {
            variant_id,
            title: row["Title"] || "",
            taglia: row["Option1 Value"] || "",
            colore: row["Option2 Value"] || "",
            image: row["Image Src"] || "",
            inventory_quantity: Number(row["Variant Inventory Qty"] || 0),
            sku: row["Variant SKU"] || "",
            numero_grafica: row["Handle"] || "",
            online: (row["Published"] || "").toLowerCase() === "true",
            timestamp: new Date(),
          };

          try {
            await setDoc(doc(db, "variants", variant_id), data);
            successCount++;
          } catch (err) {
            console.error("❌ Errore scrittura:", err, data);
          }
        }

        setStatus(`✅ ${successCount} varianti caricate su Firebase.`);
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4"
      />
      <Button variant="contained" color="primary" component="label">
        Carica CSV
        <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
      </Button>
      {status && <Typography variant="body1" sx={{ mt: 3 }}>{status}</Typography>}
    </div>
  );
}