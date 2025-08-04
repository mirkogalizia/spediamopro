// /app/api/ldv-extract/route.js
import { NextResponse } from "next/server";
import AdmZip from "adm-zip";

async function getToken(authCode) {
  const res = await fetch("https://core.spediamopro.com/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authCode }),
  });
  if (!res.ok) throw new Error("Errore login SpediamoPro");
  const data = await res.json();
  if (!data.token) throw new Error("Token mancante nella risposta");
  return data.token;
}

export async function POST(req) {
  try {
    const { idSpedizione } = await req.json();
    const authCode = process.env.SPEDIAMO_AUTHCODE;
    if (!authCode) {
      return NextResponse.json({ error: "AuthCode non configurato" }, { status: 500 });
    }

    // 1. Prendi token dinamico con authCode
    const token = await getToken(authCode);

    // 2. Scarica LDV con token appena ottenuto
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

    const contentType = ldvRes.headers.get("content-type") || "";
    const disposition = ldvRes.headers.get("content-disposition") || "";
    const buffer = Buffer.from(await ldvRes.arrayBuffer());

    // PDF singolo
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

    // ZIP con PDF dentro
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

    return NextResponse.json({ error: "Formato file LDV non gestito." }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}