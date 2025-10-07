import { NextResponse } from 'next/server';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Inizializza Admin una sola volta (safe su Vercel)
if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}
const db: Firestore = getFirestore();

// ENV Shopify
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = '2023-10';

// Parametri
const ORDERS_PAGE_LIMIT = 250;
const FALLBACK_VARIANT_LIMIT = 60; // fallback Shopify massimo
const HTTP_CONCURRENCY = 4;        // fetch in parallelo verso Shopify
const RETRIES = 2;                 // retry su 429/5xx

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function shopifyFetch(url: string, init?: RequestInit, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    ...init,
  });

  if (res.status === 429 || (res.status >= 500 && attempt < RETRIES)) {
    const retryAfter = Number(res.headers.get('Retry-After') || 0);
    await delay((retryAfter || 1) * 1000);
    return shopifyFetch(url, init, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Shopify ${res.status} ${res.statusText}: ${body}`);
  }
  return res;
}

// Paginazione ordini con fields minimi
async function fetchAllOrders(createdAtMin: string, createdAtMax: string) {
  const orders: any[] = [];
  let nextUrl =
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json` +
    `?status=open&financial_status=paid&limit=${ORDERS_PAGE_LIMIT}` +
    `&created_at_min=${encodeURIComponent(createdAtMin)}&created_at_max=${encodeURIComponent(createdAtMax)}` +
    `&fields=id,name,created_at,line_items,fulfillment_status`;

  while (nextUrl) {
    const res = await shopifyFetch(nextUrl);
    const json = await res.json();
    orders.push(...(json.orders || []));

    const link = res.headers.get('Link') || res.headers.get('link') || '';
    const m = link.match(/<([^>]+)>;\s*rel="next"/i);
    nextUrl = m?.[1] ?? '';
  }
  return orders;
}

// Runner a concorrenza limitata
async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  const run = async () => {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  };
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => run());
  await Promise.all(workers);
  return results;
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

    // 1) ORDINI (light)
    const allOrders = await fetchAllOrders(createdAtMin, createdAtMax);

    // 2) Colleziona line items validi + variantId unici
    type LineItemRaw = { order_name: string; created_at: string; item: any };
    const lines: LineItemRaw[] = [];
    const variantIdsSet = new Set<string>();

    for (const order of allOrders) {
      const order_name = order.name;
      const created_at = order.created_at;
      const items = Array.isArray(order.line_items) ? order.line_items : [];
      for (const item of items) {
        const variantId = item.variant_id ? String(item.variant_id) : '';
        if (!variantId) continue; // custom item / no variant
        lines.push({ order_name, created_at, item });
        variantIdsSet.add(variantId);
      }
    }

    const uniqueVariantIds = Array.from(variantIdsSet);
    if (uniqueVariantIds.length === 0) {
      return NextResponse.json({
        ok: true,
        firebaseCount: 0,
        shopifyCount: 0,
        totale: 0,
        produzione: [],
      });
    }

    // 3) FIRESTORE in batch (Admin SDK)
    const chunkSize = 300;
    const variantDocsMap = new Map<string, any>();
    let firebaseCount = 0;

    for (let start = 0; start < uniqueVariantIds.length; start += chunkSize) {
      const slice = uniqueVariantIds.slice(start, start + chunkSize);
      const refs = slice.map((id) => db.collection('variants').doc(id));
      const snaps = await Promise.all(refs.map((r) => r.get()));
      snaps.forEach((snap, idx) => {
        const vid = slice[idx];
        if (snap.exists) {
          variantDocsMap.set(vid, snap.data());
          firebaseCount++;
        }
      });
    }

    // 4) Shopify fallback per varianti mancanti (limitato e in parallelo)
    const missingVariantIds = uniqueVariantIds
      .filter((id) => !variantDocsMap.has(id))
      .slice(0, FALLBACK_VARIANT_LIMIT);

    const productCache = new Map<string, any>();
    let shopifyCount = 0;

    const variantTasks = missingVariantIds.map((vid) => async () => {
      // variant
      const vRes = await shopifyFetch(
        `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${vid}.json`
      );
      const { variant } = await vRes.json();

      // product (cache)
      const pid = String(variant.product_id);
      let product = productCache.get(pid);
      if (!product) {
        const pRes = await shopifyFetch(
          `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${pid}.json?fields=id,title,product_type,images,image,variants`
        );
        const pj = await pRes.json();
        product = pj.product;
        productCache.set(pid, product);
      }

      // immagine: preferisci quella della variante
      let imageSrc: string | null = product?.image?.src ?? null;
      if (variant.image_id && Array.isArray(product?.images)) {
        const match = product.images.find((img: any) => String(img.id) === String(variant.image_id));
        if (match?.src) imageSrc = match.src;
      }

      const vDoc = {
        tipo_prodotto: product?.product_type || (variant?.title?.split(' ')[0] ?? ''),
        variant_title: variant?.title ?? '',
        taglia: variant?.option1 ?? '',
        colore: variant?.option2 ?? '',
        grafica: product?.title ?? '',
        image: imageSrc,
        immagine_prodotto: imageSrc,
      };
      variantDocsMap.set(vid, vDoc);
      shopifyCount++;
    });

    if (variantTasks.length > 0) {
      await runLimited(variantTasks, HTTP_CONCURRENCY);
    }

    // 5) Costruisci produzioneRows usando prima Firestore, poi fallback
    const produzioneRows: any[] = [];
    for (const { order_name, created_at, item } of lines) {
      const variantId = String(item.variant_id);
      const v = variantDocsMap.get(variantId) ?? null;

      const tipo_prodotto =
        v?.tipo_prodotto ||
        item.product_type ||
        (item.title ? String(item.title).split(' ')[0] : '');
      const variant_title = v?.variant_title || item.variant_title || '';
      const taglia = v?.taglia || '';
      const colore = v?.colore || '';
      const grafica = v?.grafica || item.title || '';
      const immagine = v?.image || null;
      const immagine_prodotto = v?.immagine_prodotto || null;

      produzioneRows.push({
        tipo_prodotto,
        variant_title,
        taglia,
        colore,
        grafica,
        immagine,
        immagine_prodotto,
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
      notes: {
        orders: allOrders.length,
        variants_unique: uniqueVariantIds.length,
        fallback_capped:
          uniqueVariantIds.filter((id) => !variantDocsMap.has(id)).length > 0,
      },
    });
  } catch (e: any) {
    console.error('🔥 Errore nella route produzione:', e);
    return NextResponse.json(
      { ok: false, error: e.message || 'Errore interno server' },
      { status: 500 }
    );
  }
}