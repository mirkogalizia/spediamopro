// app/forecast/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Row = {
  sku_key: string;
  tipo: "hoodie" | "tshirt";
  grafica_key: string;
  taglia: string;
  colore: string;
  demand_lookback: number;
  daily_rate: number;
  forecast_service_days: number;
  safety: number;
  target: number;
  in_stock_printed: number;
  to_produce: number;
};

export default function ForecastPage() {
  const [lookback, setLookback] = useState(60);
  const [service, setService] = useState(5);
  const [safety, setSafety] = useState(15);
  const [minBatch, setMinBatch] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    ok: boolean;
    hoodie: Row[];
    tshirt: Row[];
    params?: any;
    error?: string;
  } | null>(null);

  const hoodieCost = 7.66 + 1; // felpa + stampa
  const tshirtCost = 2.26 + 1; // tshirt + stampa

  const totals = useMemo(() => {
    const hCount = data?.hoodie?.reduce((s, r) => s + r.to_produce, 0) ?? 0;
    const tCount = data?.tshirt?.reduce((s, r) => s + r.to_produce, 0) ?? 0;
    const hCost = hCount * hoodieCost;
    const tCost = tCount * tshirtCost;
    return { hCount, tCount, hCost, tCost, allCount: hCount + tCount, allCost: hCost + tCost };
  }, [data, hoodieCost, tshirtCost]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = `/api/forecast/stock?lookback=${lookback}&service=${service}&safety=${safety / 100}&min_batch=${minBatch}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setData({ ok: false, hoodie: [], tshirt: [], error: e?.message ?? "Errore" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToStock = async (row: Row) => {
    try {
      const res = await fetch("/api/stock/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_key: row.sku_key, qty: row.to_produce }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Errore");
      // ricarica per aggiornare in_stock_printed/to_produce
      fetchData();
    } catch (e: any) {
      alert(e?.message ?? "Errore aggiornamento stock");
    }
  };

  const Section = ({ title, rows, unitCost }: { title: string; rows: Row[]; unitCost: number }) => {
    const totalQty = rows.reduce((s, r) => s + r.to_produce, 0);
    const totalCost = totalQty * unitCost;
    return (
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8 }}>{title}</h2>
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          Totale pezzi: <b>{totalQty}</b> · Costo stimato: <b>{totalCost.toFixed(2)} €</b>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f5f5f7" }}>
                <th style={th}>SKU</th>
                <th style={th}>Grafica</th>
                <th style={th}>Taglia</th>
                <th style={th}>Colore</th>
                <th style={th} title="Domanda totale nel lookback">Domanda</th>
                <th style={th} title="Media/die">Daily</th>
                <th style={th}>Target</th>
                <th style={th}>In stock</th>
                <th style={th}>Da produrre</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sku_key} style={{ borderTop: "1px solid #eee" }}>
                  <td style={tdMono}>{r.sku_key}</td>
                  <td style={td}>{r.grafica_key}</td>
                  <td style={td}>{r.taglia}</td>
                  <td style={td}>{r.colore}</td>
                  <td style={tdNum}>{r.demand_lookback}</td>
                  <td style={tdNum}>{r.daily_rate.toFixed(3)}</td>
                  <td style={tdNum}>{r.target}</td>
                  <td style={tdNum}>{r.in_stock_printed}</td>
                  <td style={{ ...tdNum, fontWeight: 700 }}>{r.to_produce}</td>
                  <td style={td}>
                    <button
                      onClick={() => addToStock(r)}
                      disabled={r.to_produce <= 0}
                      style={btn}
                      title="Aggiungi questi pezzi allo stock stampato"
                    >
                      + Aggiungi a scorta
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 16, textAlign: "center", color: "#777" }}>
                    Nessun suggerimento con i filtri attuali.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "32px 24px", fontFamily: "Inter, system-ui, sans-serif", background: "#f5f5f7", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>📈 Previsionale stock da produrre</h1>
        <p style={{ color: "#555", marginBottom: 16 }}>
          Suggerimenti per coprire ~{service} giorni di domanda con scorta (safety {safety}%).
        </p>

        {/* Controls */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <Field label="Storico (giorni)">
            <input type="number" min={7} max={365} value={lookback} onChange={(e) => setLookback(+e.target.value)} />
          </Field>
          <Field label="Copertura (giorni)">
            <input type="number" min={1} max={60} value={service} onChange={(e) => setService(+e.target.value)} />
          </Field>
          <Field label="Safety (%)">
            <input type="number" min={0} max={100} value={safety} onChange={(e) => setSafety(+e.target.value)} />
          </Field>
          <Field label="Min lotto">
            <input type="number" min={1} max={50} value={minBatch} onChange={(e) => setMinBatch(+e.target.value)} />
          </Field>

          <button onClick={fetchData} style={{ ...btn, padding: "10px 16px" }}>
            {loading ? "Calcolo..." : "Ricalcola"}
          </button>
        </div>

        {/* Totals & cost */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <Kpi label="Totale pezzi consigliati (hoodie)" value={String(totals.hCount)} />
          <Kpi label="Costo stimato (hoodie)" value={`${totals.hCost.toFixed(2)} €`} />
          <Kpi label="Totale pezzi consigliati (tshirt)" value={String(totals.tCount)} />
          <Kpi label="Costo stimato (tshirt)" value={`${totals.tCost.toFixed(2)} €`} />
          <Kpi label="Totale complessivo pezzi" value={String(totals.allCount)} />
          <Kpi label="Costo complessivo stimato" value={`${totals.allCost.toFixed(2)} €`} />
        </div>

        {!data?.ok ? (
          <div style={{ color: "crimson", background: "#fff", padding: 12, borderRadius: 8 }}>
            Errore: {data?.error || "impossibile calcolare"}
          </div>
        ) : (
          <>
            <Section title="Felpe (hoodie)" rows={data.hoodie} unitCost={hoodieCost} />
            <Section title="T-shirt (tshirt)" rows={data.tshirt} unitCost={tshirtCost} />
          </>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 10, fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: 10, whiteSpace: "nowrap" };
const tdMono: React.CSSProperties = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "#555" };
const tdNum: React.CSSProperties = { ...td, textAlign: "right" };
const btn: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, background: "#111", color: "#fff", cursor: "pointer", padding: "6px 10px" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#444" }}>{label}</span>
      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "6px 8px" }}>{children}</div>
    </label>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 12, minWidth: 220 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}