import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdminPRO";
import { collection, doc, setDoc } from "firebase/firestore";

const SHOP2_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN_2;
const TOKEN2 = process.env.NEXT_PUBLIC_SHOPIFY_ADMIN_API_TOKEN_2;

const BLANKS_MAP = {
  "felpa cappuccio": "HOODIE_BASE",
  "felpa cappuccio essential": "HOODIE_ESSENTIAL",

  "felpa zip": "ZIP_BASE",
  "felpa zip essential": "ZIP_ESSENTIAL",

  "felpa girocollo": "CREWNECK",
  "t shirt": "TSHIRT",
  "tshirt": "TSHIRT",
  "t-shirt": "TSHIRT",

  "sweatpants": "PANTS",
};

function normalize(str = "") {
  return str.toLowerCase().replace(/-/g, " ").replace(/_/g, " ").trim();
}

function detectBlankCategory(product) {
  const type = normalize(product.product_type);
  const title = normalize(product.title);
  const tags = normalize(product.tags || "");

  // Se contiene "blank" nel titolo o handle → blank
  if (title.includes("blank") || (product.handle || "").includes("blank"))
    return true;

  // se il type è mappato, è blank
  if (BLANKS_MAP[type]) return true;

  // controllo nei tags
  if (tags.includes("blank")) return true;

  return false;
}

function assignCategory(product) {
  const type = normalize(product.product_type);
  const title = normalize(product.title);

  // match diretto sul type
  if (BLANKS_MAP[type]) return BLANKS_MAP[type];

  // fallback: guardo nel titolo
  for (const key in BLANKS_MAP) {
    if (title.includes(key)) return BLANKS_MAP[key];
  }

  return "UNKNOWN";
}

export async function GET() {
  try {
    let url = `https://${SHOP2_DOMAIN}/admin/api/2024-10/products.json?limit=250`;
    let allProducts = [];

    while (url) {
      const res = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": TOKEN2,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!data.products) break;

      allProducts = allProducts.concat(data.products);

      // Gestione pagination
      const linkHeader = res.headers.get("link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        url = match ? match[1] : null;
      } else {
        url = null;
      }
    }

    const blanks = [];
    const graphics = [];

    for (const p of allProducts) {
      const isBlank = detectBlankCategory(p);

      if (isBlank) {
        const cat = assignCategory(p);

        blanks.push({
          id: p.id,
          title: p.title,
          handle: p.handle,
          category: cat,
          product_type: p.product_type,
          variants: p.variants.map(v => ({
            id: v.id,
            option1: v.option1,
            option2: v.option2,
            inventory_quantity: v.inventory_quantity,
          })),
        });

      } else {
        graphics.push({
          id: p.id,
          title: p.title,
          handle: p.handle,
          product_type: p.product_type,
          variants: p.variants.map(v => ({
            id: v.id,
            option1: v.option1,
            option2: v.option2,
          })),
        });
      }
    }

    // Salvo su Firestore una versione COMPATTA
    const ref = doc(collection(db, "shopify_catalog"), "scan_result");

    await setDoc(ref, {
      updatedAt: new Date().toISOString(),
      blanks,
      graphics,
    });

    return NextResponse.json({
      status: "ok",
      total: allProducts.length,
      blanks: blanks.length,
      graphics: graphics.length,
    });

  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}