import { NextResponse } from "next/server";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN_2!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN_2!;
const API_VERSION = "2023-10";

export async function GET() {
  try {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
      return NextResponse.json(
        { error: "Missing Shopify env vars" },
        { status: 500 }
      );
    }

    let products: any[] = [];
    let pageInfo: string | null = null;

    // Shopify pagination loop
    do {
      const url = new URL(
        `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/products.json`
      );
      url.searchParams.set("limit", "250");
      if (pageInfo) url.searchParams.set("page_info", pageInfo);

      const res = await fetch(url.toString(), {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Shopify error ${res.status}: ${err}`);
      }

      const data = await res.json();
      products = [...products, ...data.products];

      // parse the pagination link header
      const linkHeader = res.headers.get("link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = match ? match[1] : null;
      } else {
        pageInfo = null;
      }

    } while (pageInfo);

    return NextResponse.json(
      {
        count: products.length,
        products,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ ERROR GET /api/shopify2/catalog:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}