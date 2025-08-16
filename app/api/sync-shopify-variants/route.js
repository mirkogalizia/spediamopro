// /app/api/sync-shopify-variants/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

async function fetchAllProducts() {
  let allProducts = [];
  let pageInfo = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL(`https://${SHOPIFY_DOMAIN}/admin/api/2024-10/products.json`);
    url.searchParams.set("limit", "250");
    if (pageInfo) url.searchParams.set("page_info", pageInfo);

    const res = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      },
    });

    if (!res.ok) throw new Error("Errore nel recupero prodotti Shopify");

    const linkHeader = res.headers.get("link") || "";
    const data = await res.json();
    allProducts.push(...data.products);

    const match = linkHeader.match(/<([^>]+)>; rel="next"/);
    pageInfo = match ? new URL(match[1]).searchParams.get("page_info") : null;
    hasNextPage = !!pageInfo;
    await new Promise(r => setTimeout(r, 600)); // Rate limit: 2 req/sec
  }

  return allProducts;
}

export async function GET() {
  let success = 0;
  let errors = [];

  try {
    const products = await fetchAllProducts();

    for (const product of products) {
      const imageMap = {};
      for (const img of product.images || []) {
        if (img.variant_ids && img.variant_ids.length > 0) {
          for (const vId of img.variant_ids) imageMap[vId] = img.src;
        }
      }

      for (const variant of product.variants) {
        const variant_id = variant.id.toString();
        const data = {
          variant_id,
          title: product.title || "",
          sku: variant.sku || "",
          taglia: variant.option1 || "",
          colore: variant.option2 || "",
          inventory_quantity: variant.inventory_quantity || 0,
          numero_grafica: product.handle || "",
          image: imageMap[variant.id] || product.image?.src || "",
          online: !!product.published_at,
          timestamp: new Date(),
        };

        try {
          await setDoc(doc(db, "variants", variant_id), data);
          success++;
        } catch (e) {
          errors.push({ variant_id, error: e.message });
        }
      }
    }

    return NextResponse.json({ success, errors });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}