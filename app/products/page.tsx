import React from 'react';

// Configurazione SOLO da variabili ambiente!
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";
const PRODUCT_ID = process.env.BLANKS_PRODUCT_ID!; // Imposta questa env con l'ID del prodotto blanks

// Tipi
interface Variant {
  id: number;
  option1: string; // Taglia
  option2: string; // Colore
  inventory_quantity: number;
}

interface ProductInfo {
  title: string;
  imageSrc: string;
}

// Recupera informazioni del prodotto (titolo e immagine principale)
async function fetchProductInfo(): Promise<ProductInfo> {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${PRODUCT_ID}.json`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Errore fetch prodotto: ${res.status} - ${err}`);
  }
  const data = await res.json();
  const product = data.product;
  const imageSrc = product.images?.[0]?.src || '';
  return { title: product.title, imageSrc };
}

// Recupera varianti blanks
async function fetchVariants(): Promise<Variant[]> {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${PRODUCT_ID}/variants.json`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Errore fetch varianti: ${res.status} - ${err}`);
  }
  const data = await res.json();
  return data.variants;
}

export default async function StockPage() {
  // Controllo ENV: se manca qualcosa blocca subito!
  if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_SHOP_DOMAIN || !PRODUCT_ID) {
    return (
      <div className="p-4 text-red-600 whitespace-pre-wrap">
        Errore: variabili ambiente mancanti!
        <br />
        Controlla SHOPIFY_TOKEN, SHOPIFY_DOMAIN, BLANKS_PRODUCT_ID.
      </div>
    );
  }

  let variants: Variant[] = [];
  let productInfo: ProductInfo;

  try {
    [productInfo, variants] = await Promise.all([
      fetchProductInfo(),
      fetchVariants(),
    ]);
  } catch (err: any) {
    return (
      <div className="p-4 text-red-600 whitespace-pre-wrap">
        Errore: {err.message}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        {productInfo.imageSrc && (
          <img src={productInfo.imageSrc} alt={productInfo.title} className="w-24 h-24 object-cover rounded-md" />
        )}
        <h1 className="text-2xl font-bold">{productInfo.title}</h1>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2 bg-gray-100">Taglia</th>
              <th className="border px-4 py-2 bg-gray-100">Colore</th>
              <th className="border px-4 py-2 bg-gray-100">Stock</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{v.option1}</td>
                <td className="border px-4 py-2">{v.option2}</td>
                <td className="border px-4 py-2 text-center">{v.inventory_quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}