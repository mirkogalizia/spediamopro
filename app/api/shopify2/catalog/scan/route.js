// app/api/shopify2/catalog/scan/route.js
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";   // ← NOME ESATTO DEL TUO FILE
import { getAllProducts } from "@/lib/shopify2";        // ← FUNZIONE CHE GIÀ USI PER LO SHOP 2

export async function GET() {
  try {
    console.log("⏳ Avvio SCAN prodotti Shopify (Store #2)...");

    // 1️⃣ Scarica TUTTI i prodotti dallo store Shopify 2
    const products = await getAllProducts();
    console.log(`📦 Prodotti scaricati: ${products.length}`);

    if (!products || !Array.isArray(products)) {
      throw new Error("Prodotti non validi ricevuti da Shopify.");
    }

    // 2️⃣ Collezione Firestore
    const colRef = adminDb.collection("shopify_catalog");

    // 3️⃣ Firestore Admin batch (scrive fino a 500 documenti per batch)
    let batch = adminDb.batch();
    let counter = 0;
    let batchCount = 1;

    for (const p of products) {
      const docRef = colRef.doc("product_" + p.id);

      batch.set(docRef, p);
      counter++;

      // Commit ogni 450 (massimo sicuro)
      if (counter >= 450) {
        console.log(`📤 Commit batch #${batchCount}`);
        await batch.commit();
        batch = adminDb.batch();
        counter = 0;
        batchCount++;
      }
    }

    // ultimo batch
    if (counter > 0) {
      console.log(`📤 Commit ultimo batch #${batchCount}`);
      await batch.commit();
    }

    console.log("✅ SCAN completato e salvato su Firestore.");

    return NextResponse.json({
      ok: true,
      message: "Dati prodotti salvati su Firestore",
      total_products: products.length,
      batches: batchCount,
    });

  } catch (err) {
    console.error("❌ ERRORE DURANTE LO SCAN:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}