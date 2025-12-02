import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";
import { shopify2 } from "@/lib/shopify2";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { phase } = await req.json();

    if (phase === "shopify") {
      return await downloadShopifyOrders();
    } else if (phase === "analyze") {
      return await analyzeData();
    }

    return NextResponse.json({ ok: false, error: "Invalid phase" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

async function downloadShopifyOrders() {
  console.log("🔄 Starting Shopify orders download...");

  let allOrders: any[] = [];
  let hasMore = true;
  let sinceId = 0;

  // Download tutti gli ordini (massimo 250 per request)
  while (hasMore && allOrders.length < 10000) {
    const url = `/orders.json?status=any&limit=250&since_id=${sinceId}&fields=id,order_number,line_items,created_at,total_price,financial_status,fulfillment_status,customer,shipping_address`;

    const res = await shopify2.api(url);
    const orders = res.orders || [];

    if (orders.length === 0) {
      hasMore = false;
      break;
    }

    allOrders = allOrders.concat(orders);
    sinceId = orders[orders.length - 1].id;

    console.log(`📦 Downloaded ${allOrders.length} orders...`);

    // Rate limit protection
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`✅ Total orders: ${allOrders.length}`);

  // Salva su Firebase
  const batches: any[][] = [];
  let currentBatch: any[] = [];

  for (const order of allOrders) {
    // Processa line items
    for (const item of order.line_items) {
      const saleRecord = {
        // Order info
        order_id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        date: order.created_at.split("T")[0],
        
        // Time features
        year: new Date(order.created_at).getFullYear(),
        month: new Date(order.created_at).getMonth(), // 0-11
        day_of_week: new Date(order.created_at).getDay(), // 0-6
        week_of_year: getWeekOfYear(new Date(order.created_at)),
        
        // Product info
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_title: item.title,
        variant_title: item.variant_title,
        sku: item.sku,
        vendor: item.vendor,
        
        // Sales metrics
        quantity: item.quantity,
        price: parseFloat(item.price),
        revenue: parseFloat(item.price) * item.quantity,
        
        // Order status
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        
        // Customer (anonimizzato)
        is_returning_customer: order.customer?.orders_count > 1,
        customer_region: order.shipping_address?.province || null,
        customer_country: order.shipping_address?.country_code || null,
        
        // Import metadata
        imported_at: new Date().toISOString(),
      };

      currentBatch.push(saleRecord);

      if (currentBatch.length >= 500) {
        batches.push([...currentBatch]);
        currentBatch = [];
      }
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Scrivi in Firebase
  console.log(`💾 Writing ${batches.length} batches to Firebase...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = adminDb.batch();

    for (const record of batches[i]) {
      const ref = adminDb.collection("ml_sales_data").doc();
      batch.set(ref, record);
    }

    await batch.commit();
    console.log(`✅ Batch ${i + 1}/${batches.length} saved`);
  }

  // Calcola statistiche
  const totalSales = batches.flat().reduce((sum, r) => sum + r.quantity, 0);
  const totalRevenue = batches.flat().reduce((sum, r) => sum + r.revenue, 0);
  const uniqueProducts = new Set(batches.flat().map((r) => r.variant_id)).size;

  return NextResponse.json({
    ok: true,
    total_orders: allOrders.length,
    total_line_items: batches.flat().length,
    total_units_sold: totalSales,
    total_revenue: totalRevenue.toFixed(2),
    unique_products: uniqueProducts,
    date_range: {
      from: allOrders[allOrders.length - 1]?.created_at,
      to: allOrders[0]?.created_at,
    },
  });
}

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek);
}

async function analyzeData() {
  // Aggregazioni base per vedere i dati
  const salesSnap = await adminDb.collection("ml_sales_data").limit(10).get();

  const samples = salesSnap.docs.map((doc) => doc.data());

  return NextResponse.json({
    ok: true,
    message: "Analysis ready",
    sample_data: samples,
  });
}
