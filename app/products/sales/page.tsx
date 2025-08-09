'use client';

import React, { useEffect, useState } from "react";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import {
  Box,
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Alert,
  Skeleton,
  Stack,
  Divider,
} from "@mui/material";
import ColorLensIcon from '@mui/icons-material/ColorLens';

type VariantData = {
  variante: string | null | undefined; // es: "M / Nero" o "Nero / M"
  venduto: number;                     // venduto ultimi 30 gg
  stock: number;                       // stock attuale (dal prodotto blanks)
};

type TypeGroup = {
  tipologia: string;
  variants: VariantData[];
};

const TAGLIE_ORDINATE = ["xs", "s", "m", "l", "xl"];
const TAGLIE_SET = new Set(TAGLIE_ORDINATE);

function normalize(str: string | null | undefined) {
  if (!str) return "";
  return str.trim().toLowerCase();
}

// capisce cosa è TAGLIA e cosa è COLORE anche se invertiti, con spazi/maiuscole variabili
function parseVariante(variante: string | null | undefined): { size: string; color: string } {
  const parts = (variante ?? "").split("/").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return { size: "Sconosciuta", color: "Sconosciuto" };
  if (parts.length === 1) {
    const t0 = normalize(parts[0]);
    return TAGLIE_SET.has(t0)
      ? { size: parts[0], color: "Sconosciuto" }
      : { size: "Sconosciuta", color: parts[0] };
  }
  const a = parts[0], b = parts[1];
  const aIsSize = TAGLIE_SET.has(normalize(a));
  const bIsSize = TAGLIE_SET.has(normalize(b));
  if (aIsSize && !bIsSize) return { size: a, color: b || "Sconosciuto" };
  if (!aIsSize && bIsSize) return { size: b, color: a || "Sconosciuto" };
  // se entrambi/non entrambi risultano taglie, prendo il primo come size e il secondo come color fallback
  return { size: a || "Sconosciuta", color: b || "Sconosciuto" };
}

// Aggrega per COLORE -> TAGLIA:
// - venduto: somma di tutte le righe stessa (taglia,colore)
// - stock: NON si somma. Si prende il valore non-zero più recente visto; se tutti zero, 0.
function aggregateByColorSize(variants: VariantData[]) {
  const grouped: Record<string, Record<string, { venduto: number; stock: number }>> = {};
  for (const v of variants) {
    const { size, color } = parseVariante(v.variante);
    const taglia = size || "Sconosciuta";
    const colore = color || "Sconosciuto";
    if (!grouped[colore]) grouped[colore] = {};
    if (!grouped[colore][taglia]) grouped[colore][taglia] = { venduto: 0, stock: 0 };

    // sommo il venduto
    grouped[colore][taglia].venduto += Number(v.venduto || 0);

    // stock: prendo un solo valore (authoritative dal blanks), non sommo
    const incoming = Number(v.stock || 0);
    const current = Number(grouped[colore][taglia].stock || 0);
    // preferisci un non-zero rispetto a zero; se current è 0 e arriva un valore >0, usalo.
    // se current >0 lo lascio (già abbiamo un valore valido); in caso volessi "ultimo", togli questo if e assegna sempre.
    if (current === 0 && incoming > 0) {
      grouped[colore][taglia].stock = incoming;
    }
    // se vuoi invece l'ULTIMO valore visto (anche 0) decommenta la riga seguente e rimuovi l'if sopra:
    // grouped[colore][taglia].stock = incoming;
  }
  return grouped;
}

export default function StockForecastByColorAndSize() {
  const router = useRouter();
  const [data, setData] = useState<TypeGroup[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const periodDays = 30;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products/sales');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json: TypeGroup[] = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const handleRefresh = () => {
    fetchData();
  };

  if (authLoading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        Caricamento autenticazione...
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 6, px: 1, maxWidth: "1100px", mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            cursor: loading ? "not-allowed" : "pointer",
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            backgroundColor: loading ? "#a0c8ff" : "#007aff",
            color: "white",
            fontWeight: "bold",
            transition: "background-color 0.3s ease",
            userSelect: "none",
          }}
          onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "#005bb5")}
          onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = "#007aff")}
        >
          {loading ? "Aggiornamento..." : "Aggiorna"}
        </button>
      </Box>

      <Typography
        variant="h3"
        fontWeight={800}
        sx={{
          mb: 6,
          background: "linear-gradient(90deg, #005bea 0%, #00c9a7 80%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Previsionale Magazzino Blanks
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, fontWeight: 600 }}>{error}</Alert>
      )}

      {loading && (
        <Stack gap={4}>
          {[1,2].map((i) => (
            <Paper key={i} sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
              <Skeleton variant="text" width={200} height={32} />
              <Skeleton variant="rectangular" height={48} sx={{ my: 1, borderRadius: 2 }} />
              <Skeleton variant="rectangular" height={48} sx={{ my: 1, borderRadius: 2 }} />
            </Paper>
          ))}
        </Stack>
      )}

      {!loading && data.map(group => {
        const agg = aggregateByColorSize(group.variants);

        return (
          <Paper
            key={group.tipologia}
            elevation={4}
            sx={{
              mb: 6,
              borderRadius: 4,
              p: 4,
              bgcolor: "#fff",
              boxShadow: "0 4px 32px 0 #b3e0ff22",
            }}
          >
            <Typography variant="h5" fontWeight={700} mb={3} color="primary">
              {group.tipologia}
            </Typography>
            <Divider sx={{ mb: 4 }} />

            {Object.entries(agg).map(([colore, taglieObj]) => (
              <Box key={colore} mb={4}>
                <Stack direction="row" alignItems="center" gap={1} mb={2}>
                  <ColorLensIcon sx={{ color: "#00c9a7" }} />
                  <Typography variant="h6" fontWeight={700} textTransform="capitalize">{colore}</Typography>
                </Stack>
                <TableContainer>
                  <Table sx={{ minWidth: 450 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: 16 }}>Taglia</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>
                          Venduto<br/>(ultimi {periodDays} gg)
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Stock attuale</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Giorni rimanenti</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Suggerimento acquisto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(taglieObj)
                        .sort(([tagliaA], [tagliaB]) => {
                          const iA = TAGLIE_ORDINATE.indexOf((tagliaA || '').toLowerCase());
                          const iB = TAGLIE_ORDINATE.indexOf((tagliaB || '').toLowerCase());
                          if (iA === -1 && iB === -1) return (tagliaA || '').localeCompare(tagliaB || '');
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map(([taglia, vals]) => {
                          const vendutoTot = vals.venduto ?? 0;
                          const stockSingolo = vals.stock ?? 0;
                          const dailyConsumption = vendutoTot / periodDays;
                          const daysRemaining =
                            dailyConsumption > 0 ? Math.floor(stockSingolo / dailyConsumption) : "∞";
                          const purchaseSuggestion =
                            dailyConsumption > 0
                              ? Math.max(0, Math.ceil(dailyConsumption * 30 - stockSingolo))
                              : 0;

                          return (
                            <TableRow
                              key={taglia}
                              sx={{
                                bgcolor: typeof daysRemaining === "number" && daysRemaining <= 7
                                  ? "#fff2f2"
                                  : "#fff"
                              }}
                            >
                              <TableCell sx={{ fontWeight: 600, fontSize: 17, textTransform: "uppercase" }}>
                                {taglia}
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={vendutoTot} color="primary" variant="outlined" size="medium" sx={{ fontWeight: 700, fontSize: 15 }}/>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={stockSingolo}
                                  color={
                                    stockSingolo === 0
                                      ? "error"
                                      : stockSingolo <= 5
                                      ? "warning"
                                      : "success"
                                  }
                                  variant="filled"
                                  size="medium"
                                  sx={{ fontWeight: 700, fontSize: 15 }}
                                />
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: 700,
                                  color:
                                    typeof daysRemaining === "number" && daysRemaining <= 7
                                      ? "#d93025"
                                      : "#006400",
                                  fontSize: 16,
                                }}
                              >
                                {daysRemaining}
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700, fontSize: 16 }}>
                                {purchaseSuggestion > 0
                                  ? <Chip label={`+${purchaseSuggestion}`} color="info" variant="outlined" size="small" sx={{ fontWeight: 700 }}/>
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Paper>
        );
      })}
    </Box>
  );
}