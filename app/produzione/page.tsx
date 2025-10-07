"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition, useCallback } from "react";
import Image from "next/image";

interface RigaProduzione {
  tipo_prodotto: string;
  taglia: string;
  colore: string;
  grafica: string;
  immagine: string | null;
  immagine_prodotto: string | null;
  order_name: string;
  created_at: string; // ISO
  variant_id: number;
  variant_title: string;
}

type StampatiState = { [variant_id: number]: boolean };

const RAW_COLORI_MAP: { [nome: string]: string } = {
  "BIANCO": "#f7f7f7", "NERO": "#050402", "VIOLA": "#663399", "TABACCO": "#663333",
  "ROYAL": "#0066CC", "VERDE BOSCO": "#336633", "ROSSO": "#993333", "PANNA": "#F3F1E9",
  "BLACK": "#050402", "TURTLE": "#999999", "FUME'": "#999999", "FUMÉ": "#999999", "FUME": "#999999",
  "SKY": "#87CEEB", "CAMMELLO": "#E4CFB1", "VERDE": "#336633", "NAVY": "#000080",
  "CREMA": "#fffdd0", "PIOMBO": "#293133", "CIOCCOLATO": "#695046", "SABBIA": "#d4c3a1",
  "ARMY": "#454B1B", "DARK GREY": "#636363", "SAND": "#C2B280", "SPORT GREY": "#CBCBCB",
  "BORDEAUX": "#784242", "NIGHT BLUE": "#040348", "DARK CHOCOLATE": "#4b3f37",
};

// normalizza chiavi colore (spazi, apostrofi, accenti)
const normalizeColorKey = (s: string) =>
  s
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .replace(/[ÉÈÊ]/g, "E");

const COLORI_MAP: { [k: string]: string } = Object.fromEntries(
  Object.entries(RAW_COLORI_MAP).map(([k, v]) => [normalizeColorKey(k), v])
);

export default function ProduzionePage() {
  const [righe, setRighe] = useState<RigaProduzione[]>([]);
  const [stampati, setStampati] = useState<StampatiState>({});
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const controllerRef = useRef<AbortController | null>(null);
  const [isPending, startTransition] = useTransition();

  // carica stampati all'avvio PRIMA di qualunque fetch
  useEffect(() => {
    const saved = localStorage.getItem("stampati");
    if (saved) setStampati(JSON.parse(saved));
  }, []);

  const normalizzaTipo = (tipo: string) => {
    const t = tipo.toLowerCase().replace(/[-\s]/g, "");
    if (t.includes("tshirt") || t.includes("t-shirt") || t.includes("tee")) return "Tshirt";
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  };

  const fetchProduzione = async () => {
    if (!from || !to) return;
    // cancella eventuale richiesta precedente
    controllerRef.current?.abort();
    const c = new AbortController();
    controllerRef.current = c;

    setLoading(true);
    try {
      const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(`/api/produzione?${qs}`, { signal: c.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.ok) {
        // normalizza tipo e ordina per ordine + data
        const arr: RigaProduzione[] = (data.produzione as RigaProduzione[]).map((r) => ({
          ...r,
          tipo_prodotto: normalizzaTipo(r.tipo_prodotto),
        }));
        arr.sort((a, b) => {
          if (a.order_name === b.order_name) return a.created_at.localeCompare(b.created_at);
          return a.order_name.localeCompare(b.order_name);
        });

        startTransition(() => setRighe(arr));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Errore fetch produzione:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleStampato = (variant_id: number) => {
    const updated = { ...stampati, [variant_id]: !stampati[variant_id] };
    setStampati(updated);
    localStorage.setItem("stampati", JSON.stringify(updated));
  };

  // Helpers per pallino colore
  const renderColorePallino = (nome: string) => {
    const colore = COLORI_MAP[normalizeColorKey(nome)] || "#999";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: colore,
            border: "1px solid #ccc",
            boxShadow: "inset 0 0 1px rgba(0,0,0,0.2)",
          }}
        />
        <strong style={{ fontSize: 16 }}>{nome}</strong>
      </div>
    );
  };

  const isStartOfOrderGroup = (index: number) =>
    index === 0 || righe[index].order_name !== righe[index - 1].order_name;

  // Pre-indici per performance: Set di grafiche/blanks NON stampati per ogni ordine
  const { orderToUnprintedGrafica, orderToUnprintedBlankKeys } = useMemo(() => {
    const g = new Map<string, Set<string>>();
    const b = new Map<string, Set<string>>();

    for (const r of righe) {
      const printed = !!stampati[r.variant_id];
      if (printed) continue;

      // per grafica
      if (r.grafica) {
        if (!g.has(r.order_name)) g.set(r.order_name, new Set());
        g.get(r.order_name)!.add(r.grafica);
      }

      // per blank key
      const key = `${r.tipo_prodotto.toLowerCase()}|||${r.taglia.toLowerCase()}|||${r.colore.toLowerCase()}`;
      if (!b.has(r.order_name)) b.set(r.order_name, new Set());
      b.get(r.order_name)!.add(key);
    }

    return { orderToUnprintedGrafica: g, orderToUnprintedBlankKeys: b };
  }, [righe, stampati]);

  // Utility: ordini unici da un indice in poi (O(n))
  const uniqueOrdersFrom = (startIdx: number) => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (let i = startIdx; i < righe.length; i++) {
      const o = righe[i].order_name;
      if (!seen.has(o)) {
        seen.add(o);
        list.push(o);
      }
    }
    return list;
  };

  const handleMissDTF = (grafica: string, index: number) => {
    if (!grafica) return;
    const orders = uniqueOrdersFrom(index);
    const toDrop = new Set<string>();
    for (const o of orders) {
      const set = orderToUnprintedGrafica.get(o);
      if (set && set.has(grafica)) toDrop.add(o);
    }
    if (toDrop.size === 0) return;
    setRighe((prev) => prev.filter((r) => !toDrop.has(r.order_name)));
  };

  const handleMissBlank = (tipo: string, taglia: string, colore: string, index: number) => {
    const keyRef = `${tipo.toLowerCase()}|||${taglia.toLowerCase()}|||${colore.toLowerCase()}`;
    const orders = uniqueOrdersFrom(index);
    const toDrop = new Set<string>();
    for (const o of orders) {
      const set = orderToUnprintedBlankKeys.get(o);
      if (set && set.has(keyRef)) toDrop.add(o);
    }
    if (toDrop.size === 0) return;
    setRighe((prev) => prev.filter((r) => !toDrop.has(r.order_name)));
  };

  // Totali magazzino (solo NON stampati) — cambia a [righe] se vuoi conteggiare tutto
  const totaliMagazzino = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of righe) {
      if (stampati[r.variant_id]) continue; // conta solo da fare
      const tipo = r.tipo_prodotto;
      const key = `${r.colore.toUpperCase()} | ${r.taglia.toUpperCase()}`;
      if (!map.has(tipo)) map.set(tipo, new Map());
      const inner = map.get(tipo)!;
      inner.set(key, (inner.get(key) || 0) + 1);
    }
    return map;
  }, [righe, stampati]);

  // Fallback immagine sicuro
  const getImgSrc = (r: RigaProduzione) => {
    const c1 = (r.immagine ?? "").trim();
    const c2 = (r.immagine_prodotto ?? "").trim();
    const src = c1 || c2;
    return src && src.startsWith("http") ? src : "/placeholder.png"; // metti un placeholder statico nel public/
  };

  return (
    <div style={{ padding: "64px 32px", fontFamily: "Inter, system-ui, sans-serif", background: "#f5f5f7", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>📦 Produzione</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <label>Da:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label>A:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            onClick={fetchProduzione}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007aff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              opacity: loading || isPending ? 0.7 : 1,
            }}
          >
            {loading ? "Caricamento..." : "Carica ordini"}
          </button>
        </div>

        <div style={{ overflowX: "auto", background: "white", borderRadius: 16, border: "1px solid #e5e5ea" }}>
          <table style={{ width: "100%", fontSize: 16, borderCollapse: "collapse" }}>
            <thead style={{ background: "#f5f5f7" }}>
              <tr>
                <th style={{ padding: 16, textAlign: "left" }}>Ordine</th>
                <th style={{ padding: 16 }}>Tipo</th>
                <th style={{ padding: 16 }}>Colore</th>
                <th style={{ padding: 16 }}>Taglia</th>
                <th style={{ padding: 16 }}>Preview</th>
                <th style={{ padding: 16, textAlign: "center" }}>❌ DTF</th>
                <th style={{ padding: 16, textAlign: "center" }}>❌ Blank</th>
                <th style={{ padding: 16, textAlign: "right" }}>Stampato</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((riga, index) => (
                <tr
                  key={`${riga.variant_id}-${riga.order_name}-${index}`}
                  style={{
                    borderBottom: "1px solid #eee",
                    borderLeft: isStartOfOrderGroup(index) ? "4px solid #007aff" : "4px solid transparent",
                    opacity: stampati[riga.variant_id] ? 0.45 : 1,
                    transition: "opacity .15s ease",
                  }}
                >
                  <td style={{ padding: 16, whiteSpace: "nowrap" }}>{riga.order_name}</td>
                  <td style={{ padding: 16 }}>{riga.tipo_prodotto}</td>
                  <td style={{ padding: 16 }}>{renderColorePallino(riga.colore)}</td>
                  <td style={{ padding: 16, fontWeight: 700, textTransform: "uppercase" }}>{riga.taglia}</td>
                  <td style={{ padding: 16 }}>
                    <div style={{ width: 84, height: 84, position: "relative" }}>
                      <Image
                        src={getImgSrc(riga)}
                        alt={riga.grafica || "Anteprima prodotto"}
                        fill
                        sizes="84px"
                        loading="lazy"
                        style={{ objectFit: "contain", borderRadius: 8, border: "1px solid #ddd", background: "#fafafa" }}
                        // Se usi domini esterni ricordati di whitelistarli in next.config.js
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleMissDTF(riga.grafica, index)}
                      title="Rimuovi ordini a valle che richiedono questa grafica"
                      style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer" }}
                    >
                      ❌
                    </button>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleMissBlank(riga.tipo_prodotto, riga.taglia, riga.colore, index)}
                      title="Rimuovi ordini a valle che richiedono questo blank"
                      style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer" }}
                    >
                      ❌
                    </button>
                  </td>
                  <td style={{ padding: 16, textAlign: "right" }}>
                    <input
                      type="checkbox"
                      checked={!!stampati[riga.variant_id]}
                      onChange={() => toggleStampato(riga.variant_id)}
                      style={{ transform: "scale(1.4)" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e5ea" }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>📦 Totale da prelevare a magazzino (non stampati):</h2>
          {Array.from(totaliMagazzino.entries()).map(([tipo, sottoMap]) => (
            <div key={tipo} style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "6px 0" }}>{tipo}</h3>
              <ul style={{ columns: 2, fontSize: 14, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
                {Array.from(sottoMap.entries()).map(([chiave, quantita]) => (
                  <li key={chiave}>
                    <strong>{quantita}×</strong> {chiave}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}