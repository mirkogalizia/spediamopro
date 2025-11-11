import React from 'react';

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN_2!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN_2!;
const SHOPIFY_API_VERSION = "2023-10";
const PRODUCT_ID = process.env.BLANKS_PRODUCT_ID!;

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
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e8eafe] to-[#e6f7fa] px-2 py-12 max-w-3xl mx-auto flex flex-col items-center">
      <div className="w-full flex flex-col items-center mb-8">
        <div className="w-28 h-28 mb-2 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
          {productInfo.imageSrc && (
            <img
              src={productInfo.imageSrc}
              alt={productInfo.title}
              className="w-full h-full object-contain"
            />
          )}
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2b59ff] to-[#00c9a7] text-center mb-1">
          {productInfo.title}
        </h1>
        <div className="text-lg text-[#555] font-medium">Situazione magazzino (blanks)</div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-lg font-semibold text-[#444] bg-white rounded-xl shadow">
                Taglia
              </th>
              <th className="px-4 py-3 text-left text-lg font-semibold text-[#444] bg-white rounded-xl shadow">
                Colore
              </th>
              <th className="px-4 py-3 text-center text-lg font-semibold text-[#444] bg-white rounded-xl shadow">
                Stock
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr
                key={v.id}
                className="transition-all hover:scale-[1.01] hover:bg-[#f3f8ff] bg-white rounded-2xl shadow-sm"
              >
                <td className="px-4 py-2">
                  <span className="inline-block px-4 py-1 rounded-xl font-bold bg-[#e9f3ff] text-[#245fff] border border-[#2b59ff33] shadow">
                    {v.option1}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-block px-4 py-1 rounded-xl font-semibold bg-[#d6f5f1] text-[#00c9a7] border border-[#00c9a733] shadow">
                    {v.option2}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={`inline-block px-5 py-1 rounded-xl font-bold
                      ${
                        v.inventory_quantity === 0
                          ? 'bg-[#ffecec] text-[#d93025]'
                          : v.inventory_quantity <= 5
                          ? 'bg-[#fff9ea] text-[#cf8700]'
                          : 'bg-[#edfbf6] text-[#009a60]'
                      }
                    `}
                  >
                    {v.inventory_quantity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}