// /app/api/ldv-extract/route.js
import { NextResponse } from "next/server";
import AdmZip from "adm-zip";

// Helper per fetch binario
async function fetchBinary(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Errore fetch LDV");
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req) {
  try {
    const { idSpedizione, token } = await req.json();

    // 1. Scarica LDV (POST su /api/v1/spedizione/{id}/ldv)
    const ldvRes = await fetch(
      `https://core.spediamopro.com/api/v1/spedizione/${idSpedizione}/ldv`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!ldvRes.ok) {
      return NextResponse.json({ error: "Errore download LDV" }, { status: 500 });
    }

    // Estrai header per capire tipo file
    const contentType = ldvRes.headers.get("content-type") || "";
    const disposition = ldvRes.headers.get("content-disposition") || "";
    const buffer = Buffer.from(await ldvRes.arrayBuffer());

    // 2. Se PDF singolo
    if (contentType.includes("pdf")) {
      return NextResponse.json({
        pdfs: [
          {
            filename:
              disposition.match(/filename="?(.+?)"?$/)?.[1] ||
              `etichetta_${idSpedizione}.pdf`,
            base64: buffer.toString("base64"),
          },
        ],
      });
    }

    // 3. Se ZIP (estrai PDF)
    if (contentType.includes("zip")) {
      const zip = new AdmZip(buffer);
      const pdfFiles = zip
        .getEntries()
        .filter((entry) => entry.entryName.toLowerCase().endsWith(".pdf"));
      if (pdfFiles.length === 0) {
        return NextResponse.json({ error: "Nessun PDF trovato nello ZIP." }, { status: 404 });
      }
      const pdfs = pdfFiles.map((entry) => ({
        filename: entry.entryName,
        base64: entry.getData().toString("base64"),
      }));
      return NextResponse.json({ pdfs });
    }

    // 4. Altro formato (errore)
    return NextResponse.json({ error: "Formato file LDV non gestito." }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}