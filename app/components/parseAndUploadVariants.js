import Papa from "papaparse";
import { db } from "@/lib/firebase";
import { collection, setDoc, doc } from "firebase/firestore";

export async function parseAndUploadVariants(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;

        for (const row of rows) {
          try {
            const variantId = row["ID"];
            if (!variantId) continue;

            const variantData = {
              id: variantId,
              title: row["Titolo"] || "",
              sku: row["SKU"] || "",
              colore: row["Colore"] || "",
              taglia: row["Taglia"] || "",
              inventory_quantity: parseInt(row["Quantità"]) || 0,
              image: row["Immagine"] || "",
              numero_grafica: row["Numero grafica"] || "",
              online: row["Online"]?.toLowerCase() === "true" || false,
            };

            await setDoc(doc(collection(db, "shopify_variants"), variantId), variantData);
          } catch (e) {
            console.error("Errore su riga:", row, e);
          }
        }

        resolve({ ok: true, total: rows.length });
      },
      error: (err) => reject(err),
    });
  });
}