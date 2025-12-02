import { adminDb } from "@/lib/firebaseAdminServer";

export async function GET() {
  try {
    await adminDb.collection("test").doc("ping").set({
      ok: true,
      timestamp: Date.now(),
    });

    return new Response(
      JSON.stringify({ status: "ok", message: "Scrittura completata" }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", error: err.message }),
      { status: 500 }
    );
  }
}