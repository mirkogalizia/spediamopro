import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;

export async function GET() {
  let cursor = null;
  let hasNextPage = true;
  let successCount = 0;
  let errorCount = 0;
  let errors = [];

  while (hasNextPage) {
    const url = new URL(`https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`);

    const query = `
      query GetVariants($cursor: String) {
        productVariants(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              title
              sku
              image { src }
              inventoryQuantity
              product {
                title
                handle
                publishedAt
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    `;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { cursor } }),
    });

    const json = await res.json();

    const edges = json?.data?.productVariants?.edges || [];
    hasNextPage = json?.data?.productVariants?.pageInfo?.hasNextPage || false;
    if (edges.length === 0) break;

    for (const edge of edges) {
      cursor = edge.cursor;
      const v = edge.node;

      const taglia = v.selectedOptions.find((opt) => opt.name.toLowerCase() === "taglia")?.value || "";
      const colore = v.selectedOptions.find((opt) => opt.name.toLowerCase() === "colore")?.value || "";

      const docId = v.id.split("/").pop(); // prende solo l'ID finale

      const data = {
        variant_id: docId,
        title: v.product.title || "",
        numero_grafica: v.product.handle || "",
        taglia,
        colore,
        sku: v.sku || "",
        image: v.image?.src || "",
        inventory_quantity: v.inventoryQuantity || 0,
        online: Boolean(v.product.publishedAt),
        timestamp: new Date(),
      };

      try {
        await setDoc(doc(db, "variants", docId), data);
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push({ variant_id: docId, error: err.message, data });
      }
    }
  }

  return NextResponse.json({ successCount, errorCount, errors });
}