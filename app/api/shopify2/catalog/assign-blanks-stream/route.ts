// app/api/shopify2/catalog/assign-blanks-stream/route.ts

import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ status: "loading", message: "Caricamento mappings..." });

        const mappingSnap = await adminDb.collection("blanks_mapping").get();
        const mapping: Record<string, string> = {};
        mappingSnap.forEach((doc) => {
          const d = doc.data();
          if (d.blank_key) mapping[doc.id.toLowerCase().trim()] = d.blank_key;
        });

        send({ status: "loading", message: `✅ ${Object.keys(mapping).length} mappings caricati` });

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

        send({ status: "loading", message: `✅ ${Object.keys(blanksMap).length} blanks caricati` });

        const productsSnap = await adminDb.collection("catalog_products").get();
        const products = productsSnap.docs.map(d => d.data());
        const totalProducts = products.length;

        send({ status: "loading", message: `✅ ${totalProducts} prodotti caricati`, total: totalProducts });

        let batch = adminDb.batch();
        const batches: FirebaseFirestore.WriteBatch[] = [];
        let counter = 0;
        let processedCount = 0;
        let skippedCount = 0;
        let currentProduct = 0;
        const skippedLog: any[] = [];

        for (const p of products) {
          currentProduct++;
          const category = (p.product_type || "").trim().toLowerCase();
          const blank_key = mapping[category];

          if (currentProduct % 5 === 0 || currentProduct === totalProducts) {
            send({
              status: "processing",
              current: currentProduct,
              total: totalProducts,
              progress: Math.round((currentProduct / totalProducts) * 100),
              processed: processedCount,
              skipped: skippedCount
            });
          }

          if (!blank_key) {
            skippedCount++;
            continue;
          }

          if (!p.variants || !Array.isArray(p.variants)) {
            skippedCount++;
            continue;
          }

          for (const v of p.variants) {
            const size = (v.option1 || "").toUpperCase().trim();
            const color = (v.option2 || "").toLowerCase().trim();

            if (!size || !color) {
              skippedCount++;
              skippedLog.push({
                product_title: p.title,
                product_id: p.id,
                variant_id: v.id,
                variant_title: v.title,
                reason: "Missing size or color",
                size,
                color,
                option1: v.option1,
                option2: v.option2
              });
              continue;
            }

            const blankVariantKey = `${size}-${color}`;
            const blankVariant = blanksMap[blank_key]?.[blankVariantKey];

            if (!blankVariant) {
              skippedCount++;
              skippedLog.push({
                product_title: p.title,
                product_id: p.id,
                product_type: p.product_type,
                variant_id: v.id,
                variant_title: v.title,
                reason: "Blank variant not found",
                blank_key,
                looking_for: blankVariantKey,
                size,
                color
              });
              continue;
            }

            const ref = adminDb.collection("graphics_blanks").doc(String(v.id));
            batch.set(ref, {
              product_id: p.id,
              variant_id_grafica: v.id,
              blank_key,
              blank_variant_id: blankVariant.variant_id,
              size,
              color,
              numero_grafica: v.numero_grafica || null,
              updated_at: new Date().toISOString()
            });

            processedCount++;
            counter++;

            if (counter >= 450) {
              batches.push(batch);
              batch = adminDb.batch();
              counter = 0;
            }
          }
        }

        if (counter > 0) batches.push(batch);

        send({ status: "committing", message: `Scrittura ${batches.length} batches su Firestore...` });

        for (let i = 0; i < batches.length; i++) {
          await batches[i].commit();
          send({
            status: "committing",
            batch: i + 1,
            totalBatches: batches.length,
            progress: Math.round(((i + 1) / batches.length) * 100)
          });
        }

        // 🔥 SALVA IL LOG SU FIREBASE
        if (skippedLog.length > 0) {
          await adminDb.collection("assignment_logs").doc("last_run").set({
            timestamp: new Date().toISOString(),
            processed: processedCount,
            skipped: skippedCount,
            total_products: totalProducts,
            skipped_details: skippedLog,
          });
        }

        send({
          status: "done",
          processed: processedCount,
          skipped: skippedCount,
          totalBatches: batches.length,
          message: "✅ Completato! Log salvato in Firebase → assignment_logs/last_run"
        });

        controller.close();

      } catch (err: any) {
        send({ status: "error", message: err.message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
