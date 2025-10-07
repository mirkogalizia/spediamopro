import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; // <-- deve esportare Admin Firestore (db.collection(...))

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --- ENV Shopify ---
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-04';

// --- Parametri ---
const ORDERS_PAGE_LIMIT = 250;
const FALLBACK_VARIANT_LIMIT = 60; // quante varianti mancate chiedere a Shopify
const FIRESTORE_CHUNK = 300;

// --- Helpers ---
async function shopifyGet(pathAndQuery: string) {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/${pathAndQuery}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    // niente cache di Next
  });
  if (!res.ok) {
    throw new Error(`Shopify ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllOrders(createdAtMin: string, createdAtMax: string) {
  const orders: any[] = [];
  let nextUrl =
    `orders.json?status=open&financial_status=paid&limit=${ORDERS_PAGE_LIMIT}` +
    `&created_at_min=${encodeURIComponent(createdAtMin)}` +
    `&created_at_max=${encodeURIComponent(createdAtMax)}` +
    `&fields=id,name,created_at,line_items`;

  // ciclo semplice con parsing header Link
  while (nextUrl) {
    const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/${nextUrl}`;
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Shopify ${res.status} ${res.statusText}: ${await res.text()}`);
    }
    const json = await res.json();
    orders.push(...(json.orders || []));

    const link = res.headers.get('Link') || '';
    const m = link.match(/<([^>]+)>;\s*rel="next"/i);
    nextUrl = m?.[1]?.replace(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/`,
      ''
    ) ?? '';
  }
  return orders;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "'from' e 'to' sono obbligatori" }, { status: 400 });
    }

    const createdAtMin = `${from}T00:00:00Z`;
    const createdAtMax = `${to}T23:59:59Z`;

    // 1) ORDINI leggeri
    const allOrders = await fetchAllOrders(createdAtMin, createdAtMax);

    type LineItemRaw = { order_name: string; created_at: string; item: any };
    const lines: LineItemRaw[] = [];
    const variantIdsSet = new Set<string>();

    for (const order of allOrders) {
      const order_name = order.name;
      const created_at = order.created_at;
      const items = Array.isArray(order.line_items) ? order.line_items : [];
      for (const item of items) {
        const variantId = item?.variant_id ? String(item.variant_id) : '';
        if (!variantId) continue;
        lines.push({ order_name, created_at, item });
        variantIdsSet.add(variantId);
      }
    }

    const uniqueVariantIds = Array.from(variantIdsSet);
    if (uniqueVariantIds.length === 0) {
      return NextResponse.json({ ok: true, firebaseCount: 0, shopifyCount: 0, totale: 0, produzione: [] });
    }

    // 2) FIRESTORE Admin: batch in chunk
    const variantDocsMap = new Map<string, any>();
    let firebaseCount = 0;

    for (let start = 0; start < uniqueVariantIds.length; start += FIRESTORE_CHUNK) {
      const slice = uniqueVariantIds.slice(start, start + FIRESTORE_CHUNK);
      const refs = slice.map((id) => db.collection('variants').doc(id));
      const snaps = await Promise.all(refs.map((r) => r.get()));
      snaps.forEach((snap, idx) => {
        if (snap.exists) {
          const vid = slice[idx];
          variantDocsMap.set(vid, snap.data());
          firebaseCount++;
        }
      });
    }

    // 3) Fallback Shopify per varianti mancanti (semplice, senza runner)
    const missing = uniqueVariantIds.filter((id) => !variantDocsMap.has(id)).slice(0, FALLBACK_VARIANT_LIMIT);
    let shopifyCount = 0;
    const productCache = new Map<string, any>();

    for (const vid of missing) {
      // variant
      const vJson = await shopifyGet(`variants/${vid}.json`);
      const variant = vJson.variant;

      // product (con cache)
      const pid = String(variant.product_id);
      let product = productCache.get(pid);
      if (!product) {
        const pJson = await shopifyGet(
          `products/${pid}.json?fields=id,title,product_type,images,image,variants`
        );
        product = pJson.product;
        productCache.set(pid, product);
      }

      // immagine preferendo quella della variante
      let imageSrc: string | null = product?.image?.src ?? null;
      if (variant.image_id && Array.isArray(product?.images)) {
        const match = product.images.find((img: any) => String(img.id) === String(variant.image_id));
        if (match?.src) imageSrc = match.src;
      }

      variantDocsMap.set(vid, {
        tipo_prodotto: product?.product_type || (variant?.title?.split(' ')[0] ?? ''),
        variant_title: variant?.title ?? '',
        taglia: variant?.option1 ?? '',
        colore: variant?.option2 ?? '',
        grafica: product?.title ?? '',
        image: imageSrc,
        immagine_prodotto: imageSrc,
      });
      shopifyCount++;
    }

    // 4) Costruzione righe
    const produzioneRows: any[] = [];
    for (const { order_name, created_at, item } of lines) {
      const variantId = String(item.variant_id);
      const v = variantDocsMap.get(variantId) ?? null;

      produzioneRows.push({
        tipo_prodotto:
          v?.tipo_prodotto || item.product_type || (item.title ? String(item.title).split(' ')[0] : ''),
        variant_title: v?.variant_title || item.variant_title || '',
        taglia: v?.taglia || '',
        colore: v?.colore || '',
        grafica: v?.grafica || item.title || '',
        immagine: v?.image || null,
        immagine_prodotto: v?.immagine_prodotto || null,
        order_name,
        created_at,
        variant_id: item.variant_id,
      });
    }

    produzioneRows.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json({
      ok: true,
      firebaseCount,
      shopifyCount,
      totale: produzioneRows.length,
      produzione: produzioneRows,
    });
  } catch (e: any) {
    console.error('🔥 Errore nella route produzione:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Errore interno server' }, { status: 500 });
  }
}