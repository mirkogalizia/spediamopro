import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { doc, getDoc } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = '2023-10';

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
    const allOrders: any[] = [];

    let nextUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=open&financial_status=paid&limit=250&created_at_min=${createdAtMin}&created_at_max=${createdAtMax}`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Shopify API error ${response.status}: ${errTxt}`);
      }

      const json = await response.json();
      allOrders.push(...(json.orders || []));

      const linkHeader = response.headers.get('Link');
      const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = match?.[1] || null;
    }

    const produzioneRows: any[] = [];
    let firebaseCount = 0;
    let shopifyCount = 0;
    let shopifyFallbackLimit = 20;

    for (const order of allOrders) {
      for (const item of order.line_items) {
        const variantId = String(item.variant_id);
        const docRef = doc(db, 'variants', variantId);
        const snap = await getDoc(docRef);

        let v: any;

        if (snap.exists()) {
          v = snap.data();
          firebaseCount++;
        } else if (shopifyCount < shopifyFallbackLimit) {
          try {
            const res = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`, {
              method: 'GET',
              headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json',
              },
            });

            if (!res.ok) continue;
            const { variant } = await res.json();

            const productRes = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${variant.product_id}.json`, {
              method: 'GET',
              headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json',
              },
            });

            if (!productRes.ok) continue;
            const { product } = await productRes.json();

            v = {
              tipo_prodotto: product.product_type || variant.title.split(' ')[0],
              variant_title: variant.title,
              taglia: variant.option1 || '',
              colore: variant.option2 || '',
              grafica: product.title,
              image: product.image?.src || null,
              immagine_prodotto: product.image?.src || null,
            };

            shopifyCount++;
          } catch (err) {
            console.error(`❌ Errore nel fallback Shopify per variant ${variantId}`, err);
            continue;
          }
        } else {
          continue; // oltre il limite di fallback
        }

        produzioneRows.push({
          tipo_prodotto: v.tipo_prodotto || item.product_type || item.title.split(' ')[0],
          variant_title: v.variant_title || item.variant_title || '',
          taglia: v.taglia || '',
          colore: v.colore || '',
          grafica: v.grafica || item.title,
          immagine: v.image || null,
          immagine_prodotto: v.immagine_prodotto || null,
          order_name: order.name,
          created_at: order.created_at,
          variant_id: item.variant_id,
        });
      }
    }

    produzioneRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({
      ok: true,
      firebaseCount,
      shopifyCount,
      totale: produzioneRows.length,
      produzione: produzioneRows
    });
  } catch (e: any) {
    console.error('🔥 Errore nella route produzione:', e);
    return NextResponse.json({ ok: false, error: e.message || 'Errore interno server' }, { status: 500 });
  }
}