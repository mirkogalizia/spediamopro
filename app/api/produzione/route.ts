import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

    for (const order of allOrders) {
      for (const item of order.line_items) {
        const variantId = String(item.variant_id);
        let docData = null;

        const docRef = doc(db, 'variants', variantId);
        const snap = await getDoc(docRef);

        // ✅ Se esiste e ha i dati minimi, usa Firebase
        if (snap.exists()) {
          const v = snap.data();
          if (v.colore && v.taglia && v.image) {
            docData = v;
          }
        }

        // 🔁 Se non esiste o dati incompleti, recupera da Shopify
        if (!docData) {
          try {
            const variantRes = await fetch(
              `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`,
              {
                method: 'GET',
                headers: {
                  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                  'Content-Type': 'application/json',
                },
              }
            );

            const variantJson = await variantRes.json();
            const variant = variantJson.variant;
            const productId = variant.product_id;

            let productData: any = null;

            const productRes = await fetch(
              `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`,
              {
                method: 'GET',
                headers: {
                  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (productRes.ok) {
              const json = await productRes.json();
              productData = json.product;
            }

            const image =
              productData?.images?.find((img: any) =>
                img.variant_ids.includes(variant.id)
              )?.src || productData?.image?.src || '';

            docData = {
              variant_id: String(variant.id),
              product_id: String(productId),
              title: productData?.title || '',
              taglia: variant.option1 || '',
              colore: variant.option2 || '',
              image,
              inventory_quantity: variant.inventory_quantity ?? 0,
              sku: variant.sku || '',
              numero_grafica: productData?.handle || '',
              online: productData?.published_at !== null,
              timestamp: new Date().toISOString(),
            };

            // ✅ Salva in Firebase per uso futuro
            await setDoc(docRef, docData);
          } catch (err) {
            console.error(`❌ Errore caricamento Shopify per variant ${variantId}:`, err);
            continue; // Salta la riga se fallisce
          }
        }

        // ✅ Inserisci nella tabella finale
        produzioneRows.push({
          tipo_prodotto: docData?.tipo_prodotto || item.product_type || item.title.split(' ')[0],
          variant_title: item.variant_title || '',
          taglia: docData?.taglia || '',
          colore: docData?.colore || '',
          grafica: item.title,
          immagine: docData?.image || null,
          immagine_prodotto: docData?.image || null,
          order_name: order.name,
          created_at: order.created_at,
          variant_id: item.variant_id,
        });
      }
    }

    produzioneRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({ ok: true, produzione: produzioneRows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Errore interno server' }, { status: 500 });
  }
}