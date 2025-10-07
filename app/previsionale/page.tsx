// app/previsionale/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

type Reco = {
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

type ApiResp = {
  ok: boolean;
  params: { lookbackDays: number; serviceDays: number; safetyFactor: number; minBatch: number };
  hoodie: Reco[];
  tshirt: Reco[];
  error?: string;
};

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const hoodieUnit = 7.66 + 1;  // hoodie + stampa
const tshirtUnit = 2.26 + 1;  // tshirt + stampa

export default function PrevisionalePage() {
  const [lookback, setLookback] = useState(90);
  const [serviceDays, setServiceDays] = useState(15);
  const [safety, setSafety] = useState(15);        // percento
  const [minBatch, setMinBatch] = useState(2);

  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        lookback: String(lookback),
        service: String(serviceDays),
        safety: String(safety / 100),
        min_batch: String(minBatch),
      });
      const res = await fetch(`/api/forecast/stock?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp;
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const [tab, setTab] = useState<"hoodie" | "tshirt">("hoodie");

  const list = useMemo(() => {
    if (!data?.ok) return [];
    return (tab === "hoodie" ? data.hoodie : data.tshirt).map(r => ({ ...r }));
  }, [data, tab]);

  const totalToProduce = list.reduce((acc, r) => acc + r.to_produce, 0);
  const totalCost = list.reduce((acc, r) => acc + r.to_produce * (r.tipo === "hoodie" ? hoodieUnit : tshirtUnit), 0);

  return (
    <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>📈 Previsionale stock da produrre</h1>
      <p style={{ marginTop: 0, color: "#666" }}>Suggerimenti per coprire ~{serviceDays} giorni di domanda con scorta.</p>

      {/* FILTRI */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "12px 0 16px" }}>
        <label>Storico (giorni)</label>
        <input type="number" value={lookback} onChange={e => setLookback(+e.target.value)} style={{ width: 80 }} />
        <label>Copertura (giorni)</label>
        <input type="number" value={serviceDays} onChange={e => setServiceDays(+e.target.value)} style={{ width: 80 }} />
        <label>Safety (%)</label>
        <input type="number" value={safety} onChange={e => setSafety(+e.target.value)} style={{ width: 80 }} />
        <label>Min lotto</label>
        <input type="number" value={minBatch} onChange={e => setMinBatch(+e.target.value)} style={{ width: 80 }} />
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", marginLeft: "auto" }}
        >
          {loading ? "Calcolo…" : "Ricalcola"}
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Totale pezzi consigliati ({tab})</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{totalToProduce}</div>
        </div>
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Costo stimato ({tab})</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{eur(totalCost)}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setTab("hoodie")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: tab === "hoodie" ? "#eef5ff" : "white" }}
          >
            Felpe
          </button>
          <button
            onClick={() => setTab("tshirt")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: tab === "tshirt" ? "#eef5ff" : "white" }}
          >
            T-shirt
          </button>
        </div>
      </div>

      {/* TABELLA */}
      {!data?.ok ? (
        <div style={{ color: "crimson" }}>Errore: {data?.error || "impossibile calcolare"}</div>
      ) : list.length === 0 ? (
        <div style={{ color: "#666" }}>Nessun suggerimento con questi parametri.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f7f7f7" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Grafica</th>
                <th style={{ textAlign: "left", padding: 8 }}>Taglia</th>
                <th style={{ textAlign: "left", padding: 8 }}>Colore</th>
                <th style={{ textAlign: "right", padding: 8 }}>Domanda 90g</th>
                <th style={{ textAlign: "right", padding: 8 }}>Media/die</th>
                <th style={{ textAlign: "right", padding: 8 }}>Forecast {serviceDays}g</th>
                <th style={{ textAlign: "right", padding: 8 }}>Safety</th>
                <th style={{ textAlign: "right", padding: 8 }}>Target</th>
                <th style={{ textAlign: "right", padding: 8 }}>In stock</th>
                <th style={{ textAlign: "right", padding: 8 }}>Da produrre</th>
                <th style={{ textAlign: "right", padding: 8 }}>Costo</th>
                <th style={{ textAlign: "center", padding: 8 }}>Azione</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const unit = r.tipo === "hoodie" ? hoodieUnit : tshirtUnit;
                return (
                  <tr key={r.sku_key} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 8 }}>{r.grafica_key}</td>
                    <td style={{ padding: 8 }}>{r.taglia}</td>
                    <td style={{ padding: 8 }}>{r.colore}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{r.demand_lookback}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{r.daily_rate.toFixed(3)}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{r.forecast_service_days.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{r.safety}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{r.target}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{r.in_stock_printed}</td>
                    <td style={{ padding: 8, textAlign: "right", minWidth: 90 }}>
                      {r.to_produce}
                    </td>
                    <td style={{ padding: 8, textAlign: "right" }}>{eur(r.to_produce * unit)}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <button
                        disabled
                        title="Prossimo step: invio a produzione"
                        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "not-allowed", opacity: .5 }}
                      >
                        Aggiungi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}