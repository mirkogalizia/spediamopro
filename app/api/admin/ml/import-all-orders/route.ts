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
    } else if (phase === "count") {
      return await countExistingOrders();
    }

    return NextResponse.json({ ok: false, error: "Invalid phase" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// CONTA quanti ordini hai già
async function countExistingOrders() {
  const count = await adminDb.collection("ml_sales_data").count().get();
  
  return NextResponse.json({
    ok: true,
    existing_records: count.data().count,
  });
}

async function downloadShopifyOrders() {
  console.log("🔄 Starting FULL Shopify orders download...");

  // Step 1: Controlla quanti ordini ci sono su Shopify
  const countRes = await shopify2.api("/orders/count.json?status=any");
  const totalOrdersOnShopify = countRes.count;
  
  console.log(`📊 Total orders on Shopify: ${totalOrdersOnShopify}`);

  let allOrders: any[] = [];
  let hasMore = true;
  
  // Inizia dalla data più recente e va indietro
  let maxDate: string | null = null;
  let iteration = 0;
  const MAX_ITERATIONS = 200; // Safety limit (200 * 250 = 50,000 ordini max)

  while (hasMore && iteration < MAX_ITERATIONS) {
    iteration++;
    
    // Costruisci URL con filtro data
    let url = `/orders.json?status=any&limit=250&order=created_at+desc&fields=id,order_number,line_items,created_at,total_price,financial_status,fulfillment_status,customer,shipping_address`;
    
    if (maxDate) {
      url += `&created_at_max=${maxDate}`;
    }

    console.log(`🔄 Batch ${iteration}: fetching...`);

    const res = await shopify2.api(url);
    const orders = res.orders || [];

    if (orders.length === 0) {
      console.log("✅ No more orders to fetch");
      hasMore = false;
      break;
    }

    allOrders = allOrders.concat(orders);
    
    // Imposta maxDate per prossima iterazione (ultimo ordine di questo batch)
    const oldestOrder = orders[orders.length - 1];
    maxDate = oldestOrder.created_at;

    console.log(`📦 Batch ${iteration}: +${orders.length} orders (Total: ${allOrders.length}/${totalOrdersOnShopify})`);
    console.log(`   Oldest in batch: ${maxDate}`);

    // Se abbiamo scaricato meno di 250, significa che siamo alla fine
    if (orders.length < 250) {
      console.log("✅ Last batch (partial)");
      hasMore = false;
    }

    // Rate limit protection
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`✅ Download complete: ${allOrders.length} orders`);

  if (allOrders.length < totalOrdersOnShopify) {
    console.warn(`⚠️ Warning: Downloaded ${allOrders.length} but Shopify has ${totalOrdersOnShopify}`);
  }

  // Deduplica (nel caso ci siano duplicati)
  const uniqueOrders = Array.from(
    new Map(allOrders.map(order => [order.id, order])).values()
  );

  console.log(`🔍 After dedup: ${uniqueOrders.length} unique orders`);

  // Salva su Firebase
  const batches: any[][] = [];
  let currentBatch: any[] = [];

  for (const order of uniqueOrders) {
    for (const item of order.line_items) {
      const saleRecord = {
        // Order info
        order_id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        date: order.created_at.split("T")[0],
        
        // Time features
        year: new Date(order.created_at).getFullYear(),
        month: new Date(order.created_at).getMonth(),
        day_of_week: new Date(order.created_at).getDay(),
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

  console.log(`💾 Writing ${batches.length} batches to Firebase...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = adminDb.batch();

    for (const record of batches[i]) {
      // Usa compound key per evitare duplicati
      const docId = `${record.order_id}_${record.variant_id}_${record.created_at}`;
      const ref = adminDb.collection("ml_sales_data").doc(docId);
      batch.set(ref, record, { merge: true });
    }

    await batch.commit();
    console.log(`✅ Batch ${i + 1}/${batches.length} saved`);
  }

  // Statistiche finali
  const allRecords = batches.flat();
  const totalSales = allRecords.reduce((sum, r) => sum + r.quantity, 0);
  const totalRevenue = allRecords.reduce((sum, r) => sum + r.revenue, 0);
  const uniqueProducts = new Set(allRecords.map((r) => r.variant_id)).size;

  // Date range
  const dates = uniqueOrders.map(o => new Date(o.created_at).getTime()).sort((a, b) => a - b);
  const firstDate = new Date(dates[0]).toISOString();
  const lastDate = new Date(dates[dates.length - 1]).toISOString();

  return NextResponse.json({
    ok: true,
    total_orders_shopify: totalOrdersOnShopify,
    total_orders_downloaded: uniqueOrders.length,
    total_line_items: allRecords.length,
    total_units_sold: totalSales,
    total_revenue: totalRevenue.toFixed(2),
    unique_products: uniqueProducts,
    date_range: {
      from: firstDate,
      to: lastDate,
    },
    coverage_percentage: ((uniqueOrders.length / totalOrdersOnShopify) * 100).toFixed(1),
  });
}

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek);
}

async function analyzeData() {
  const salesSnap = await adminDb.collection("ml_sales_data").limit(10).get();
  const samples = salesSnap.docs.map((doc) => doc.data());

  return NextResponse.json({
    ok: true,
    message: "Analysis ready",
    sample_data: samples,
  });
}
