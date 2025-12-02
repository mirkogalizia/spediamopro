import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";

const SHOP = process.env.SHOPIFY_DOMAIN_2;
const TOKEN = process.env.SHOPIFY_TOKEN_2;

async function fetchShopifyProducts(url) {
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Errore Shopify: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const linkHeader = res.headers.get("link");
  let nextPage = null;

  if (linkHeader && linkHeader.includes('rel="next"')) {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (match && match[1]) nextPage = match[1];
  }

  return { data, nextPage };
}

export async function GET() {
  if (!SHOP || !TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Missing Shopify env variables" },
      { status: 500 }
    );
  }

  let url = `https://${SHOP}/admin/api/2023-10/products.json?limit=250`;
  let totalProducts = 0;

  const blanksMatrix = {};
  const missingBlanks = {};

  while (url) {
    const { data, nextPage } = await fetchShopifyProducts(url);

    for (const prod of data.products) {
      totalProducts++;

      const productClean = {
        id: prod.id,
        title: prod.title,
        handle: prod.handle,
        product_type: prod.product_type?.trim() || "UNKNOWN",
        tags: prod.tags || "",
        options: prod.options || [],
        images: prod.images || [],
        variants: prod.variants || []
      };

      // 🔥 SALVATAGGIO FIRESTORE (modo corretto)
      await db
        .collection("shopify_catalog_raw")
        .doc(String(prod.id))
        .set(productClean);

      // 🔥 COSTRUZIONE MATRICE BLANKS
      const TYPE = productClean.product_type.toLowerCase();
      const TAGLIE = productClean.options.find(o => o.name.toLowerCase() === "taglia")?.values || [];
      const COLORI = productClean.options.find(o => o.name.toLowerCase() === "colore")?.values || [];

      if (!blanksMatrix[TYPE]) blanksMatrix[TYPE] = {};

      for (const tg of TAGLIE) {
        if (!blanksMatrix[TYPE][tg]) blanksMatrix[TYPE][tg] = new Set();
        for (const col of COLORI) {
          blanksMatrix[TYPE][tg].add(col);
        }
      }

      // 🔥 CHECK BLANKS MANCANTI
      for (const v of productClean.variants) {
        const size = v.option1;
        const color = v.option2;

        if (!size || !color) continue;

        if (!blanksMatrix[TYPE]?.[size]?.has(color)) {
          if (!missingBlanks[TYPE]) missingBlanks[TYPE] = {};
          if (!missingBlanks[TYPE][size]) missingBlanks[TYPE][size] = new Set();
          missingBlanks[TYPE][size].add(color);
        }
      }
    }

    url = nextPage;
  }

  // 🔥 Convert SET → Array
  const blanksMatrixClean = JSON.parse(
    JSON.stringify(blanksMatrix, (_, value) => (value instanceof Set ? [...value] : value))
  );

  const missingBlanksClean = JSON.parse(
    JSON.stringify(missingBlanks, (_, value) => (value instanceof Set ? [...value] : value))
  );

  // 🔥 Salvataggio su Firestore
  await db.collection("shopify_catalog").doc("blanks_matrix").set(blanksMatrixClean);
  await db.collection("shopify_catalog").doc("blanks_missing").set(missingBlanksClean);

  return NextResponse.json({
    ok: true,
    total_products: totalProducts,
    blanks_matrix: blanksMatrixClean,
    missing_blanks: missingBlanksClean,
  });
}