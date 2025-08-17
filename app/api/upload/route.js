import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_API_VERSION = '2023-10';

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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const pageInfo = searchParams.get('page_info');
    const limit = 10;

    let url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${limit}`;
    if (pageInfo) url += `&page_info=${pageInfo}`;

    const res = await fetch(url, {
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
    const sliced = products.slice(0, 10); // sicurezza

    let saved = 0;

    for (const product of sliced) {
      const imageMap = {};
      for (const img of product.images || []) {
        imageMap[img.id] = img.src;
      }

      for (const variant of product.variants || []) {
        const variant_id = String(variant.id);
        const ref = db.collection('variants').doc(variant_id);

        const variantImage = variant.image_id ? imageMap[variant.image_id] : '';

        const docData = {
          variant_id,
          product_id: String(product.id),
          title: product.title,
          variant_title: variant.title,
          taglia: variant.option1 || '',
          colore: variant.option2 || '',
          image: variantImage,
          inventory_quantity: variant.inventory_quantity ?? 0,
          sku: variant.sku || '',
          numero_grafica: product.handle,
          online: product.published_at !== null,
          timestamp: new Date().toISOString(),
        };

        await ref.set(docData);
        saved++;
      }
    }

    const linkHeader = res.headers.get('link');
    const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    let nextPageInfo = null;
    if (match) {
      const parsed = new URL(match[1]);
      nextPageInfo = parsed.searchParams.get('page_info');
    }

    return NextResponse.json({
      ok: true,
      saved,
      total_products: sliced.length,
      nextPageInfo,
    });

  } catch (e) {
    console.error("🔥 Errore:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}