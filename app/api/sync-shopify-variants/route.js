// app/api/sync-variants/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;

async function fetchAllProducts(cursor = null, products = []) {
  let url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/products.json?limit=250`;
  if (cursor) url += `&page_info=${cursor}`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Errore fetch da Shopify");

  const data = await res.json();
  products.push(...data.products);

  const linkHeader = res.headers.get("link");
  const nextMatch = linkHeader?.match(/<[^>]+page_info=([^&>]+)[^>]*>; rel="next"/);

  if (nextMatch) {
    return fetchAllProducts(nextMatch[1], products);
  }

  return products;
}

export async function GET() {
  try {
    const products = await fetchAllProducts();

    let success = 0;
    let failed = 0;
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
          online: product.published_at !== null,
          timestamp: new Date(),
        };

        try {
          await setDoc(doc(db, "variants", variant_id), data);
          success++;
        } catch (e) {
          errors.push({ variant_id, error: e.message });
          failed++;
        }
      }
    }

    return NextResponse.json({ success, failed, errors });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}