// app/api/produzione/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_TOKEN!;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_API_VERSION = "2023-10";

const TAGLIE_SET = new Set(["xs", "s", "m", "l", "xl"]);

function parseVarTitle(title: string | null | undefined): { size: string; color: string } {
  const raw = (title ?? "").split("/").map(p => p.trim()).filter(Boolean);
  if (raw.length === 0) return { size: "", color: "" };
  if (raw.length === 1) {
    const t0 = raw[0].toLowerCase();
    return TAGLIE_SET.has(t0) ? { size: t0, color: "" } : { size: "", color: t0 };
  }
  const a = raw[0], b = raw[1];
  const aIsSize = TAGLIE_SET.has(a.toLowerCase());
  const bIsSize = TAGLIE_SET.has(b.toLowerCase());
  if (aIsSize && !bIsSize) return { size: a, color: b };
  if (!aIsSize && bIsSize) return { size: b, color: a };
  return { size: a, color: b };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "'from' e 'to' sono obbligatori" }, { status: 400 });
    }

    const createdAtMin = `${from}T00:00:00Z`;
    const createdAtMax = `${to}T23:59:59Z`;
    const allOrders: any[] = [];

    let nextUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=open&financial_status=paid&limit=250&created_at_min=${createdAtMin}&created_at_max=${createdAtMax}`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Shopify API error ${response.status}: ${errTxt}`);
      }

      const json = await response.json();
      allOrders.push(...(json.orders || []));

      const linkHeader = response.headers.get("Link");
      if (linkHeader) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        nextUrl = match && match[1] ? match[1] : null;
      } else {
        nextUrl = null;
      }
    }

    const produzioneRows: any[] = [];

    for (const order of allOrders) {
      for (const item of order.line_items) {
        const variantId = item.variant_id;

        // Recupera immagine variante
        let variantImage = null;
        try {
          const variantRes = await fetch(
            `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`,
            {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json",
              },
            }
          );
          if (variantRes.ok) {
            const variantJson = await variantRes.json();
            variantImage = variantJson?.variant?.image?.src || null;
          }
        } catch (err) {
          console.warn(`Impossibile recuperare immagine per variante ${variantId}`);
        }

        const { size, color } = parseVarTitle(item.variant_title);

        produzioneRows.push({
          tipo_prodotto: item.product_type || item.title.split(" ")[0],
          variant_title: item.variant_title || '',
          taglia: size,
          colore: color,
          grafica: item.title,
          immagine: variantImage,
          order_name: order.name,
          created_at: order.created_at,
          variant_id: variantId,
        });
      }
    }

    produzioneRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({ ok: true, produzione: produzioneRows });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Errore interno server" }, { status: 500 });
  }
}