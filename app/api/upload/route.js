// /app/api/shopify/fetch-and-save-products/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_API_VERSION = "2023-10";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let nextUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
    let totalSaved = 0;
    let totalFailed = 0;
    let errors = [];

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`Shopify API error ${res.status}: ${errTxt}`);
      }

      const data = await res.json();
      const products = data.products || [];

      for (const product of products) {
        try {
          await setDoc(doc(db, "shopify_products", String(product.id)), product);
          totalSaved++;
        } catch (e) {
          totalFailed++;
          errors.push({ id: product.id, error: e.message });
        }
      }

      const linkHeader = res.headers.get("Link");
      const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = match?.[1] || null;
    }

    return NextResponse.json({ ok: true, totalSaved, totalFailed, errors });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
