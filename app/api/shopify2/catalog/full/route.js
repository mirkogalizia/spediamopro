import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdminServer";
import { collection, doc, setDoc } from "firebase-admin/firestore";

const SHOP = process.env.SHOPIFY_DOMAIN_2;
const TOKEN = process.env.SHOPIFY_TOKEN_2;
const API_VERSION = "2023-10";

const CATEGORY_MAP = {
  "felpa cappuccio": "HOODIE_BASE",
  "felpa cappuccio essential": "HOODIE_ESSENTIAL",
  "felpa zip": "ZIP_BASE",
  "felpa zip essential": "ZIP_ESSENTIAL",
  "felpa girocollo": "CREWNECK",
  "t shirt": "TSHIRT",
  "sweatpants": "PANTS",
};

function normalize(str = "") {
  return str.trim().toLowerCase();
}

function detectCategory(productType) {
  const key = normalize(productType);
  return CATEGORY_MAP[key] || null;
}

function extractMatrix(products) {
  const matrix = {};

  for (const p of products) {
    const cat = detectCategory(p.product_type);
    if (!cat) continue;

    if (!matrix[cat]) matrix[cat] = {};

    for (const v of p.variants) {
      const size = v.option1;
      const color = v.option2;
      const qty = v.inventory_quantity ?? 0;

      if (!matrix[cat][color]) matrix[cat][color] = {};
      matrix[cat][color][size] = qty;
    }
  }

  return matrix;
}

function detectMissing(matrix) {
  const missing = {};

  for (const cat of Object.keys(matrix)) {
    missing[cat] = {};

    const colors = Object.keys(matrix[cat]);
    const SIZES = ["XS", "S", "M", "L", "XL"];

    for (const color of colors) {
      const sizesAvailable = Object.keys(matrix[cat][color]);

      const missingSizes = SIZES.filter(s => !sizesAvailable.includes(s));

      if (missingSizes.length > 0) {
        missing[cat][color] = missingSizes;
      }
    }
  }

  return missing;
}

async function fetchAllProducts() {
  let pageInfo = null;
  let products = [];

  while (true) {
    const url = `https://${SHOP}/admin/api/${API_VERSION}/products.json?limit=250` +
      (pageInfo ? `&page_info=${pageInfo}` : "");

    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Errore caricamento prodotti");

    const data = await res.json();
    products.push(...data.products);

    const link = res.headers.get("link");
    if (!link || !link.includes('rel="next"')) break;

    const match = link.match(/page_info=([^&>]+)/);
    pageInfo = match ? match[1] : null;
  }

  return products;
}

export async function GET() {
  try {
    // 1. Fetch prodotti
    const products = await fetchAllProducts();

    // 2. Salvataggio RAW
    const productsCollection = collection(db, "shopify_catalog_raw");
    for (const p of products) {
      await setDoc(doc(productsCollection, String(p.id)), p);
    }

    // 3. Costruzione matrices
    const blanksMatrix = extractMatrix(products);

    // 4. Detect missing
    const missing = detectMissing(blanksMatrix);

    // 5. Save matrix
    await setDoc(doc(db, "shopify_catalog", "blanks_matrix"), blanksMatrix);

    // 6. Save missing
    await setDoc(doc(db, "shopify_catalog", "blanks_missing"), missing);

    return NextResponse.json({
      ok: true,
      products: products.length,
      blanks_matrix: blanksMatrix,
      missing,
    });
  } catch (error) {
    console.error("SCAN ERROR", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}