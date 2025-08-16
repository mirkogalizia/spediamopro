// /app/api/shopify/fetch-all-products/route.js
import { db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_VERSION = "2024-07"; // aggiorna se necessario

export async function GET() {
  const limit = 250;
  let page = 1;
  let successCount = 0;
  let errorCount = 0;
  let totalProducts = 0;
  const errors = [];

  try {
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_VERSION}/products.json?limit=${limit}&page=${page}`, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json",
        },
        method: "GET",
      });

      if (!res.ok) {
        const error = await res.text();
        return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
      }

      const data = await res.json();
      const products = data.products;
      totalProducts += products.length;

      for (const product of products) {
        try {
          const productRef = doc(db, "shopify_products", product.id.toString());
          await setDoc(productRef, product);
          successCount++;
        } catch (e) {
          errorCount++;
          errors.push({ id: product.id, error: e.message });
        }
      }

      if (products.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      message: "Importazione completata",
      totalProducts,
      successCount,
      errorCount,
      errors,
    }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}