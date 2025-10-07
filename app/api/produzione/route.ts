import { NextResponse } from 'next/server';
// ⬇️ Usa esplicitamente l'Admin SDK qui, così non dipendi dai tipi del tuo lib
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --- INIT FIREBASE ADMIN ---
// Consiglio: tieni un env con il JSON del service account su Vercel
// Settings → Environment Variables → FIREBASE_SERVICE_ACCOUNT_JSON
if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  initializeApp({ credential: cert(sa) });
}
const adb: AdminFirestore = getFirestore(); // <— Admin Firestore garantito

// --- SHOPIFY ENV ---
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-04';

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

    let nextUrl =
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json` +
      `?status=open&financial_status=paid&limit=250` +
      `&created_at_min=${encodeURIComponent(createdAtMin)}` +
      `&created_at_max=${encodeURIComponent(createdAtMax)}`;

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

      const linkHeader = response.headers.get('Link') || response.headers.get('link') || '';
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
      nextUrl = match?.[1] || null;
    }

    const produzioneRows: any[] = [];
    let firebaseCount = 0;
    let shopifyCount = 0;
    const shopifyFallbackLimit = 20;

    for (const order of allOrders) {
      const items = Array.isArray(order.line_items) ? order.line_items : [];
      for (const item of items) {
        const variantId = item?.variant_id ? String(item.variant_id) : '';
        if (!variantId) continue;

        // ✅ Admin SDK: niente client SDK qui
        const snap = await adb.collection('variants').doc(variantId).get();
        let v: any;

        if (snap.exists) {
          v = snap.data();
          firebaseCount++;
        } else if (shopifyCount < shopifyFallbackLimit) {
          try {
            const vRes = await fetch(
              `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (!vRes.ok) continue;
            const { variant } = await vRes.json();

            const pRes = await fetch(
              `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${variant.product_id}.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (!pRes.ok) continue;
            const { product } = await pRes.json();

            v = {
              tipo_prodotto: product.product_type || (variant.title?.split(' ')[0] ?? ''),
              variant_title: variant.title,
              taglia: variant.option1 || '',
              colore: variant.option2 || '',
              grafica: product.title,
              image: product.image?.src || null,
              immagine_prodotto: product.image?.src || null,
            };

            shopifyCount++;
          } catch (err) {
            console.error(`❌ Fallback Shopify variant ${variantId}`, err);
            continue;
          }
        } else {
          continue; // oltre il limite di fallback
        }

        produzioneRows.push({
          tipo_prodotto: v?.tipo_prodotto || item.product_type || (item.title ? String(item.title).split(' ')[0] : ''),
          variant_title: v?.variant_title || item.variant_title || '',
          taglia: v?.taglia || '',
          colore: v?.colore || '',
          grafica: v?.grafica || item.title,
          immagine: v?.image || null,
          immagine_prodotto: v?.immagine_prodotto || null,
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
      produzione: produzioneRows,
    });
  } catch (e: any) {
    console.error('🔥 Errore nella route produzione:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Errore interno server' }, { status: 500 });
  }
}