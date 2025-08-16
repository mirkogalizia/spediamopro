// app/api/shopify/fetch-all-products/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { setDoc, doc } from 'firebase/firestore';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

async function fetchAllProducts() {
  const products = [];
  let url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/products.json?limit=250`;
  let count = 0;

  while (url) {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Errore Shopify: ${res.statusText}`);
    }

    const data = await res.json();
    products.push(...data.products);
    count += data.products.length;

    // Cerca il link per la prossima pagina
    const linkHeader = res.headers.get('link');
    const nextLink = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
    url = nextLink || null;
  }

  return products;
}

export async function GET() {
  try {
    const products = await fetchAllProducts();
    let success = 0;
    let errorList = [];

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
          online: product.published_at !== null,
          timestamp: new Date(),
        };

        try {
          await setDoc(doc(db, 'variants', variant_id), data);
          success++;
        } catch (err) {
          errorList.push({ variant_id, message: err.message });
        }
      }
    }

    return NextResponse.json({
      message: `✅ ${success} varianti salvate. ❌ ${errorList.length} errori.`,
      errors: errorList,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}