import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 🔥 funzione delay
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

// 🔥 funzione con retry automatico in caso di 429
async function safeShopifyCall(url: string, options: any = {}, retry = 0) {
  try {
    return await shopify2.api(url, options);
  } catch (err: any) {
    if (err.status === 429 && retry < 5) {
      console.warn(`⏳ Rate-limit. Retry #${retry + 1} in 800ms...`);
      await wait(800);
      return safeShopifyCall(url, options, retry + 1);
    }
    throw err;
  }
}

export async function POST() {
  try {
    console.log("🚀 Avvio associazione varianti → blanks");

    const blanksSnap = await adminDb.collection("blanks_products").get();
    const blanks = blanksSnap.docs.map((d) => d.data());

    console.log(`🟦 Blanks trovati: ${blanks.length}`);

    const allProductsRes = await safeShopifyCall("/products.json?limit=250");
    const products = allProductsRes.products || [];

    console.log(`🟧 Prodotti Shopify caricati: ${products.length}`);

    const associations = [];

    for (const product of products) {
      for (const variant of product.variants) {

        // 💡 estrai taglia + colore
        const size = variant.option1?.toLowerCase().trim();
        const color = variant.option2?.toLowerCase().trim();

        if (!size || !color) {
          console.log(`⚪ Skippato variante ${variant.id} (no size/color)`);
          continue;
        }

        // trova il blank corrispondente
        const blank = blanks.find(
          (b) =>
            b.size?.toLowerCase() === size &&
            b.color?.toLowerCase() === color &&
            b.type?.toLowerCase() === product.product_type?.toLowerCase()
        );

        if (!blank) {
          console.log(`🔸 Nessun blank trovato per variante ${variant.id}`);
          continue;
        }

        console.log(`🔹 Associo ${variant.id} → ${blank.variant_id}`);

        // 🔥 delay per NON prendere 429
        await wait(450);

        // scrivo su Firestore
        associations.push({
          product_id: product.id,
          variant_id_grafica: variant.id,
          blank_key: blank.key,
          blank_variant_id: blank.variant_id,
        });

        await adminDb
          .collection("graphics_blanks")
          .doc(`${variant.id}`)
          .set(associations[associations.length - 1]);

      }
    }

    console.log(`✅ Associazioni completate: ${associations.length}`);

    return NextResponse.json({
      ok: true,
      associations_count: associations.length,
    });

  } catch (err: any) {
    console.error("❌ ERRORE assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}