import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_API_VERSION = '2023-10';

if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_SHOP_DOMAIN) {
  throw new Error('SHOPIFY_TOKEN o SHOPIFY_DOMAIN non impostati in .env');
}

const serviceAccount = {
  type: "service_account",
  project_id: "spediamopro-a4936",
  private_key_id: "cb272a15ea640ebbd0d0b48e582f6a22d26a6dc4",
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: "firebase-adminsdk-fbsvc@spediamopro-a4936.iam.gserviceaccount.com",
  client_id: "114809406991123817846",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40spediamopro-a4936.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let nextUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalVariants = 0;
    const errors = [];

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
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

          const existing = await ref.get();
          const forceUpdate = true;

          if (!forceUpdate && existing.exists) {
            const data = existing.data();
            if (
              data &&
              data.title &&
              data.variant_title &&
              data.inventory_quantity !== undefined &&
              data.image
            ) {
              totalSkipped++;
              continue;
            }
          }

          const docData = {
            variant_id,
            product_id: String(product.id),
            title: product.title,
            variant_title: variant.title,
            taglia: variant.option1 || '',
            colore: variant.option2 || '',
            image: product.image?.src || '',
            inventory_quantity: variant.inventory_quantity ?? 0,
            sku: variant.sku || '',
            numero_grafica: product.handle,
            online: product.published_at !== null,
            timestamp: new Date().toISOString(),
          };

          try {
            await ref.set(docData, { merge: true });
            totalSaved++;
            console.log(`✅ Salvato variant ${variant_id} (${docData.title})`);
          } catch (err) {
            totalFailed++;
            errors.push({ variant_id, message: err.message });
            console.error(`❌ Errore variant ${variant_id}: ${err.message}`);
          }
        }
      }

      const linkHeader = res.headers.get('link');
      const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = match?.[1] || null;
    }

    return NextResponse.json({
      ok: true,
      totalVariants,
      totalSaved,
      totalSkipped,
      totalFailed,
      errors,
    });
  } catch (e) {
    console.error("🔥 Errore generale:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}