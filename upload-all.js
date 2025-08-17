const fetch = require('node-fetch');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin Init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = admin.firestore();

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION;

async function run() {
  let nextUrl = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalVariants = 0;
  const errors = [];

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Errore Shopify ${res.status}: ${errText}`);
    }

    const { products } = await res.json();

    for (const product of products) {
      for (const variant of product.variants || []) {
        totalVariants++;
        const variant_id = String(variant.id);
        const ref = db.collection('variants').doc(variant_id);

        try {
          const existing = await ref.get();
          const data = existing.exists ? existing.data() : null;

          const docData = {
            variant_id,
            product_id: String(product.id),
            title: product.title,
            variant_title: variant.title,
            taglia: variant.option1 || '',
            colore: variant.option2 || '',
            image: variant.image_id
              ? (product.images.find(img => img.id === variant.image_id)?.src || '')
              : (product.image?.src || ''),
            inventory_quantity: variant.inventory_quantity ?? 0,
            sku: variant.sku || '',
            numero_grafica: product.handle,
            online: product.published_at !== null,
            timestamp: new Date().toISOString(),
          };

          const isSame = data &&
            data.title === docData.title &&
            data.variant_title === docData.variant_title &&
            data.taglia === docData.taglia &&
            data.colore === docData.colore &&
            data.image === docData.image &&
            data.inventory_quantity === docData.inventory_quantity;

          if (isSame) {
            totalSkipped++;
            continue;
          }

          await ref.set(docData);
          totalSaved++;
          console.log(`✅ Salvato variant ${variant_id} (${docData.title})`);
        } catch (err) {
          errors.push({ variant_id, message: err.message });
          console.error(`❌ Errore variant ${variant_id}: ${err.message}`);
        }
      }
    }

    const linkHeader = res.headers.get('link');
    const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match?.[1] || null;
  }

  console.log(`\n---`);
  console.log(`Totale varianti trovate: ${totalVariants}`);
  console.log(`✅ Salvate: ${totalSaved}`);
  console.log(`⏭️ Skippate (già presenti): ${totalSkipped}`);
  console.log(`❌ Errori: ${errors.length}`);
  if (errors.length) console.log(errors);
}

run();