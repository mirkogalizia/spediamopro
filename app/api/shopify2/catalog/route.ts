import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOPIFY_DOMAIN_2!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN_2!;
const API_VERSION = "2023-10";

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  throw new Error("🚨 SHOPIFY_DOMAIN_2 o SHOPIFY_TOKEN_2 non presenti nelle env!");
}

const BASE_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;

// ------------------------------------------
// 🔥 FUNZIONE PER RICHIEDERE UNA PAGINA DI PRODOTTI
// ------------------------------------------
async function fetchProductsPage(pageInfo?: string) {
  const url = pageInfo
    ? `${BASE_URL}/products.json?limit=250&page_info=${pageInfo}`
    : `${BASE_URL}/products.json?limit=250`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Errore Shopify: ${res.status} - ${text}`);
  }

  // Shopify manda i link di paginazione nelle intestazioni
  const linkHeader = res.headers.get("link");
  let nextPage: string | null = null;

  if (linkHeader) {
    const links = linkHeader.split(",");
    links.forEach((link) => {
      const match = link.match(/<([^>]+page_info=([^>]+))>; rel="next"/);
      if (match) nextPage = match[2];
    });
  }

  const data = await res.json();
  return { products: data.products, nextPage };
}

// ------------------------------------------
// 🔥 FUNZIONE PRINCIPALE
// ------------------------------------------
export async function GET() {
  try {
    let allProducts: any[] = [];
    let nextPage: string | null = null;

    // Scarico tutte le pagine (paginazione completa)
    do {
      const { products, nextPage: np } = await fetchProductsPage(nextPage);
      allProducts = [...allProducts, ...products];
      nextPage = np;
    } while (nextPage);

    // ------------------------------------------
    // 🔥 COSTRUISCO UN DATASET COMPLETO E PRONTO PER ML
    // ------------------------------------------
    const dataset = allProducts.map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      status: p.status,
      product_type: p.product_type,
      vendor: p.vendor,
      tags: p.tags,
      created_at: p.created_at,
      updated_at: p.updated_at,

      // 🔥 Immagini
      images: p.images?.map((img: any) => ({
        id: img.id,
        src: img.src,
        alt: img.alt,
      })) || [],

      // 🔥 Options (es: Taglia, Colore)
      options: p.options?.map((opt: any) => ({
        id: opt.id,
        name: opt.name,
        position: opt.position,
        values: opt.values,
      })) || [],

      // 🔥 Varianti complete
      variants: p.variants?.map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        barcode: v.barcode,
        price: v.price,
        compare_at_price: v.compare_at_price,
        inventory_quantity: v.inventory_quantity,
        requires_shipping: v.requires_shipping,
        taxable: v.taxable,
        weight: v.grams,
      })) || [],

      // 🔥 Metafields (se ci servono in seguito)
      // Se vuoi esportare tutti i metafield devo aggiungere una chiamata aggiuntiva
      metafields: p.metafields || null,
    }));

    return NextResponse.json({
      count: dataset.length,
      products: dataset,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: true,
        message: err.message,
      },
      { status: 500 }
    );
  }
}