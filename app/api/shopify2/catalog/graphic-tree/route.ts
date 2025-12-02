import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    console.log("🌳 Caricamento albero grafiche-blanks...");

    // 1️⃣ Carica tutti i blanks
    const blanksSnap = await adminDb.collection("blanks_stock").get();
    const blanksData: Record<string, any> = {};

    for (const blankDoc of blanksSnap.docs) {
      const blankKey = blankDoc.id;
      const blankInfo = blankDoc.data();

      // Carica varianti del blank
      const variantsSnap = await adminDb
        .collection("blanks_stock")
        .doc(blankKey)
        .collection("variants")
        .get();

      const variants: any[] = [];
      variantsSnap.forEach((v) => {
        variants.push({
          id: v.id,
          ...v.data(),
        });
      });

      blanksData[blankKey] = {
        blank_key: blankKey,
        product_id: blankInfo.product_id,
        name: blankInfo.name || blankKey,
        variants,
        total_variants: variants.length,
      };
    }

    // 2️⃣ Carica tutte le associazioni graphics_blanks
    const associationsSnap = await adminDb.collection("graphics_blanks").get();
    
    const tree: Record<string, any> = {};

    // 3️⃣ Costruisci l'albero
    for (const [blankKey, blankData] of Object.entries(blanksData)) {
      tree[blankKey] = {
        blank: {
          blank_key: blankKey,
          product_id: blankData.product_id,
          name: blankData.name,
          total_variants: blankData.total_variants,
          image: null, // Lo carichiamo dopo
        },
        variants: {},
      };

      // Per ogni variante blank
      for (const variant of blankData.variants) {
        const variantKey = `${variant.taglia}-${variant.colore}`;
        
        tree[blankKey].variants[variantKey] = {
          variant_id: variant.variant_id,
          size: variant.taglia,
          color: variant.colore,
          stock: variant.stock,
          graphics: [],
        };
      }
    }

    // 4️⃣ Aggiungi grafiche associate
    associationsSnap.forEach((doc) => {
      const assoc = doc.data();
      const blankKey = assoc.blank_key;
      const variantKey = `${assoc.size}-${assoc.color}`;

      if (tree[blankKey]?.variants[variantKey]) {
        tree[blankKey].variants[variantKey].graphics.push({
          variant_id_grafica: assoc.variant_id_grafica,
          product_id: assoc.product_id,
          product_title: assoc.product_title || "N/A",
          numero_grafica: assoc.numero_grafica,
          size: assoc.size,
          color: assoc.color,
        });
      }
    });

    // 5️⃣ Carica immagini prodotti da Shopify (batch per blank)
    const productIds = new Set<number>();
    associationsSnap.forEach((doc) => {
      const productId = doc.data().product_id;
      if (productId) productIds.add(productId);
    });

    // Carica anche blank product IDs
    Object.values(blanksData).forEach((blank: any) => {
      if (blank.product_id) productIds.add(blank.product_id);
    });

    const productsImages: Record<number, string> = {};

    // Carica immagini (limita a primi 50 per performance)
    const productIdsArray = Array.from(productIds).slice(0, 50);
    
    for (const productId of productIdsArray) {
      try {
        const res = await shopify2.getProduct(productId);
        if (res?.product?.image?.src) {
          productsImages[productId] = res.product.image.src;
        }
      } catch (err) {
        console.log(`⚠️ Errore caricamento immagine product ${productId}`);
      }
    }

    // 6️⃣ Aggiungi immagini all'albero
    for (const [blankKey, blankTree] of Object.entries(tree)) {
      const blankProductId = blanksData[blankKey].product_id;
      if (blankProductId && productsImages[blankProductId]) {
        blankTree.blank.image = productsImages[blankProductId];
      }

      // Aggiungi immagini alle grafiche
      for (const variantData of Object.values(blankTree.variants)) {
        (variantData as any).graphics.forEach((graphic: any) => {
          if (productsImages[graphic.product_id]) {
            graphic.image = productsImages[graphic.product_id];
          }
        });
      }
    }

    // 7️⃣ Calcola statistiche
    let totalBlanks = Object.keys(tree).length;
    let totalVariants = 0;
    let totalGraphics = 0;
    let orphanVariants = 0;

    for (const blankTree of Object.values(tree)) {
      const variants = Object.values((blankTree as any).variants);
      totalVariants += variants.length;

      variants.forEach((v: any) => {
        totalGraphics += v.graphics.length;
        if (v.graphics.length === 0) orphanVariants++;
      });
    }

    return NextResponse.json({
      ok: true,
      tree,
      stats: {
        totalBlanks,
        totalVariants,
        totalGraphics,
        orphanVariants,
      },
    });
  } catch (err: any) {
    console.error("❌ Errore graphics-tree:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
