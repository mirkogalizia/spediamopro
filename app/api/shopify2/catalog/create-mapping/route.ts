import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdminServer";

// BLANKS ufficiali
const BLANKS = {
  crewneck: 15315087524223,
  felpa_cappuccio: 15315049218431,
  tshirt: 15315045089663,
  zip_hoodie: 15315031261567,
  sweatpants: 15315031228799,
};

// Categorie da mappare (quelle ESSENTIAL vengono ignorate)
const CATEGORY_MAP: Record<string, string | null> = {
  "felpa girocollo": "crewneck",
  "felpa cappuccio": "felpa_cappuccio",
  "t shirt": "tshirt",
  "sweatpants": "sweatpants",
  "felpa zip": "zip_hoodie",

  // NON assegnare blank → gestiremo dopo
  "felpa cappuccio essential": null,
  "felpa zip essential": null,
  "calzini": null,
  "pantaloni cargo shorts": null,
  "camicie": null,
  "gift card": null,
  "no_type": null,
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("blanks_mapping");

    const results: any[] = [];

    for (const [cat, blankKey] of Object.entries(CATEGORY_MAP)) {
      const normalized = cat.toLowerCase().trim();
      const docRef = collectionRef.doc(normalized);

      if (!blankKey) {
        // Categoria ignorata (no blanks)
        batch.set(docRef, {
          category: normalized,
          blank_assigned: false,
          product_id: null,
        });

        results.push({
          category: normalized,
          blank: null,
          assigned: false,
        });

        continue;
      }

      const productId = BLANKS[blankKey];

      batch.set(docRef, {
        category: normalized,
        blank_assigned: true,
        blank_key: blankKey,
        product_id: productId,
      });

      results.push({
        category: normalized,
        blank: blankKey,
        product_id: productId,
      });
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      message: "Mapping creato con successo",
      mapping: results,
    });
  } catch (err: any) {
    console.error("Errore mapping:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}