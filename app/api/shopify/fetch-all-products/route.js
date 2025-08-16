import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { setDoc, doc } from 'firebase/firestore';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

async function fetchAllProducts() {
  const products = [];
  let url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/products.json?limit=250`;
  let tries = 0;

  while (url && tries < 30) {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Errore Shopify: ${res.statusText}`);
    const data = await res.json();
    products.push(...data.products);

    const linkHeader = res.headers.get("link");
    const nextLink = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
    url = nextLink || null;
    tries++;
  }

  return products;
}

export async function GET() {
  try {
    const products = await fetchAllProducts();
    let success = 0;
    const errors = [];

    for (const product of products) {
      for (const variant of product.variants) {
        const variant_id = variant.id.toString();
        const data = {
          variant_id,
          title: product.title || "",
          taglia: variant.option1 || "",
          colore: variant.option2 || "",
          image: product.image?.src || "",
          inventory_quantity: variant.inventory_quantity || 0,
          sku: variant.sku || "",
          numero_grafica: product.handle || "",
          online: !!product.published_at,
          timestamp: new Date(),
        };

        try {
          await setDoc(doc(db, 'variants', variant_id), data);
          success++;
        } catch (e) {
          errors.push({ variant_id, message: e.message });
        }
      }
    }

    return NextResponse.json({
      message: `✅ ${success} varianti caricate. ❌ ${errors.length} errori.`,
      errors,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}