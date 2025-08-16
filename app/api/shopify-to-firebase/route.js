import { NextResponse } from "next/server";
import { db } from "../../firebase"; // <-- importa la tua configurazione Firebase
import { collection, doc, setDoc } from "firebase/firestore";

const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;

export async function GET() {
  const products = [];

  let url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07/products.json?limit=250`;
  let hasNext = true;

  while (hasNext && url) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const linkHeader = res.headers.get("link");
    hasNext = linkHeader?.includes('rel="next"');

    if (hasNext) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (match) url = match[1];
    } else {
      url = null;
    }

    const data = await res.json();
    products.push(...data.products);
  }

  for (const product of products) {
    const docRef = doc(db, "products", product.id.toString());
    await setDoc(docRef, {
      id: product.id,
      title: product.title,
      handle: product.handle,
      vendor: product.vendor,
      status: product.status,
      tags: product.tags,
      image: product.image?.src || null,
      variants: product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        price: v.price,
        inventory_quantity: v.inventory_quantity,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
      })),
    });
  }

  return NextResponse.json({ success: true, count: products.length });
}