"use client";
import { useState } from "react";

export default function PrintLdv({ token }) {
  const [idSpedizione, setIdSpedizione] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePrint = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ldv-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSpedizione, token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore LDV");

      data.pdfs.forEach(({ filename, base64 }) => {
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const win = window.open("", "_blank");
        win.document.write(`<iframe src="${url}" style="width:100%;height:100vh;border:none;" onload="this.contentWindow.print()"></iframe>`);
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePrint}>
      <input
        type="text"
        placeholder="ID Spedizione"
        value={idSpedizione}
        onChange={(e) => setIdSpedizione(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !idSpedizione}>
        {loading ? "Scaricando..." : "Stampa LDV"}
      </button>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </form>
  );
}