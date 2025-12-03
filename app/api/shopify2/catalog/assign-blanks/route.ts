import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";

// Delay utility
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Shopify safe wrapper
async function safeShopify(path: string) {
  try {
    return await shopify2.api(path);
  } catch (err) {
    console.warn("❌ Shopify error on:", path);
    return null; // NON lanciamo errori → non blocca tutto
  }
}

export async function POST() {
  try {
    console.log("▶️ START assign-blanks");

    // 1) LOAD MAPPING
    const mappingSnap = await adminDb.collection("blanks_mapping").get();

    const mapping: Record<string, string> = {};
    mappingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.blank_key) mapping[doc.id] = d.blank_key;
    });

    if (!Object.keys(mapping).length) {
      return NextResponse.json({
        ok: false,
        error: "❌ Nessun mapping categoria → blank."
      });
    }

    console.log("📦 MAPPING:", mapping);

    // 2) LOAD PRODUCTS
    const productsRes = await safeShopify("/products.json?limit=250");
    if (!productsRes || !productsRes.products) {
      throw new Error("❌ Shopify non ha restituito products");
    }

    const products = productsRes.products;
    console.log(`📦 Prodotti caricati: ${products.length}`);

    // 3) LOAD BLANK STOCK
    const blanksSnap = await adminDb.collection("blanks_stock").get();
    const blanksMap: Record<string, Record<string, any>> = {};

    for (const blankDoc of blanksSnap.docs) {
      const blank_key = blankDoc.id;
      blanksMap[blank_key] = {};

      const variantsSnap = await adminDb
        .collection("blanks_stock")
        .doc(blank_key)
        .collection("variants")
        .get();

      variantsSnap.forEach((v) => {
        blanksMap[blank_key][v.id] = v.data();
      });
    }

    console.log(`📦 Blanks caricati: ${Object.keys(blanksMap).length}`);

    // 4) CARICA METAFIELDS PER TUTTI I PRODOTTI
    const allMetafields: Record<number, any> = {};

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      const metaRes = await safeShopify(`/products/${p.id}/metafields.json`);
      if (!metaRes || !metaRes.metafields) continue;

      for (const m of metaRes.metafields) {
        if (m.owner_resource === "variant" &&
            m.namespace === "custom" &&
            m.key === "numero_grafica") 
        {
          allMetafields[m.owner_id] = m.value;
        }
      }

      await delay(300);
    }

    console.log(`🎨 Metafields caricati: ${Object.keys(allMetafields).length}`);

    // 5) PROCESS PRODUCTS
    let batch = adminDb.batch();
    const batches = [];
    let counter = 0;

    const processed = [];
    const skipped = [];

    for (const p of products) {
      const category = (p.product_type || "").trim().toLowerCase();
      const blank_key = mapping[category];

      if (!blank_key) {
        skipped.push({ product_id: p.id, reason: "NO_CATEGORY_MAPPING" });
        continue;
      }

      if (!p.variants || !Array.isArray(p.variants)) {
        skipped.push({ product_id: p.id, reason: "NO_VARIANTS" });
        continue;
      }

      for (const v of p.variants) {
        if (!v) continue;

        const size = (v.option1 || "").trim().toUpperCase();
        const color = (v.option2 || "").trim().toLowerCase();

        if (!size || !color) {
          skipped.push({ variant_id: v.id, reason: "BAD_VARIANT_OPTIONS" });
          continue;
        }

        const blankKey = `${size}-${color}`;
        const blankVariant = blanksMap[blank_key]?.[blankKey];

        if (!blankVariant) {
          skipped.push({
            variant_id: v.id,
            reason: "BLANK_VARIANT_NOT_FOUND",
            tried: blankKey
          });
          continue;
        }

        const numero_grafica = allMetafields[v.id] || null;

        const ref = adminDb
          .collection("graphics_blanks")
          .doc(String(v.id));

        batch.set(ref, {
          product_id: p.id,
          variant_id_grafica: v.id,
          blank_key,
          blank_variant_id: blankVariant.variant_id,
          numero_grafica,
          size,
          color,
          updated_at: new Date().toISOString()
        });

        processed.push({ v: v.id, p: p.id });

        counter++;
        if (counter >= 480) {
          batches.push(batch);
          batch = adminDb.batch();
          counter = 0;
        }
      }
    }

    if (counter > 0) batches.push(batch);

    for (const b of batches) await b.commit();

    console.log("✅ COMPLETATO");

    return NextResponse.json({
      ok: true,
      processed: processed.length,
      skipped: skipped.length,
      skipped_items: skipped.slice(0, 30)
    });

  } catch (err: any) {
    console.error("❌ ERRORE assign-blanks:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}