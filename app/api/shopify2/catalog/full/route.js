// app/api/shopify2/catalog/full/route.js
import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdminPRO";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_2;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN_2;
const API_VERSION = "2023-10";

/**
 * Fetch paginated products from Shopify
 */
async function fetchAllProducts() {
  let products = [];
  let pageInfo = null;

  while (true) {
    const url = new URL(
      `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/products.json`
    );

    url.searchParams.set("limit", "250");
    if (pageInfo) {
      url.searchParams.set("page_info", pageInfo);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Errore Shopify: ${res.status} - ${err}`);
    }

    const data = await res.json();
    products.push(...data.products);

    // Check pagination
    const link = res.headers.get("link");
    if (!link || !link.includes('rel="next"')) break;

    const match = link.match(/page_info=([^&>]+)/);
    pageInfo = match ? match[1] : null;
    if (!pageInfo) break;
  }

  return products;
}

/**
 * Clean & normalize product data
 */
function normalizeProduct(p) {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    status: p.status,
    product_type: p.product_type ?? "Unknown",
    vendor: p.vendor ?? "",
    tags: p.tags ?? "",
    created_at: p.created_at,
    updated_at: p.updated_at,
    body_html: p.body_html ?? "",
    image: p.image?.src ?? "",
    images: p.images?.map((img) => img.src) ?? [],
    options: p.options ?? [],
    variants: p.variants?.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      barcode: v.barcode,
      price: v.price,
      compare_at_price: v.compare_at_price,
      inventory_item_id: v.inventory_item_id,
      inventory_quantity: v.inventory_quantity,
      weight: v.weight,
      weight_unit: v.weight_unit,
      created_at: v.created_at,
      updated_at: v.updated_at,
      image_id: v.image_id,
    })),
  };
}

/**
 * Save dataset to Firestore
 */
async function saveToFirestore(productsNormalized) {
  const ref = adminDB.collection("shopify_catalog").doc("all_products");
  await ref.set(
    {
      updatedAt: new Date(),
      count: productsNormalized.length,
      products: productsNormalized,
    },
    { merge: true }
  );
}

export async function GET() {
  try {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
      return NextResponse.json(
        { error: "Variabili Shopify mancanti" },
        { status: 400 }
      );
    }

    console.log("📦 Fetching full Shopify catalog…");

    const products = await fetchAllProducts();
    console.log(`➡️ Trovati ${products.length} prodotti`);

    const normalized = products.map(normalizeProduct);

    await saveToFirestore(normalized);

    return NextResponse.json(
      {
        status: "ok",
        message: "Catalogo Shopify salvato in Firestore",
        count: normalized.length,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("❌ ERRORE:", e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}