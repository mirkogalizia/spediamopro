// app/api/shopify2/catalog/get-skip-log/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const doc = await adminDb.collection("assignment_logs").doc("last_run").get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: "No log found" }, { status: 404 });
    }

    return NextResponse.json(doc.data());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
