import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

const SHOP = process.env.SHOPIFY_DOMAIN_2;
const TOKEN = process.env.SHOPIFY_TOKEN_2;

export async function GET() {
  try {
    if (!SHOP || !TOKEN) {
      return NextResponse.json(
        { error: "Missing Shopify credentials" },
        { status: 500 }
      );
    }

    let allProducts = [];
    let pageInfo = null;

    do {
      const url = `https://${SHOP}/admin/api/2023-10/products.json?limit=250${
        pageInfo ? `&page_info=${pageInfo}` : ""
      }`;

      const res = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Shopify error: ${res.status}`);
      }

      const linkHeader = res.headers.get("link");
      const data = await res.json();
      allProducts = allProducts.concat(data.products);

      // parser page_info Shopify
      if (linkHeader && linkHeader.includes(`rel="next"`)) {
        const match = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = match ? match[1] : null;
      } else {
        pageInfo = null;
      }
    } while (pageInfo);

    // 📌 SALVO OGNI PRODOTTO COME DOCUMENTO SEPARATO
    const batch = adminDB.batch();
    const colRef = adminDB.collection("shopify_products");

    allProducts.forEach((p) => {
      const docRef = colRef.doc(String(p.id));
      batch.set(docRef, p, { merge: true });
    });

    await batch.commit();

    return NextResponse.json({
      status: "ok",
      total_saved: allProducts.length,
      message: "Tutti i prodotti salvati in documenti separati",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}