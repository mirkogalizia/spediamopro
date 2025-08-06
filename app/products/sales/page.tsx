import React, { useEffect, useState } from "react";
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
  variante: string | null | undefined;
  venduto: number;
  stock: number;
};

type TypeGroup = {
  tipologia: string;
  variants: VariantData[];
};

function normalize(str: string | null | undefined) {
  if (!str) return "";
  return str.trim().toLowerCase();
}

const TAGLIE_ORDINATE = ["xs", "s", "m", "l", "xl"];

export default function StockForecastByColorAndSize() {
  const [data, setData] = useState<TypeGroup[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const periodDays = 30;

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products/sales');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json: TypeGroup[] = await res.json();
      console.log("Dati aggiornati ricevuti:", json);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  function groupVariants(variants: VariantData[]) {
    const grouped: Record<string, Record<string, VariantData[]>> = {};
    variants.forEach(v => {
      const [tagliaRaw, coloreRaw] = (v.variante ?? "").split("/").map(s => s.trim());
      const taglia = tagliaRaw || "Sconosciuta";
      const colore = coloreRaw || "Sconosciuto";
      if (!grouped[colore]) grouped[colore] = {};
      if (!grouped[colore][taglia]) grouped[colore][taglia] = [];
      grouped[colore][taglia].push(v);
    });
    return grouped;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 6, px: 1, maxWidth: "1100px", mx: "auto" }}>
      {/* Bottone Aggiorna in alto a destra */}
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

      {!loading && data.map(group => (
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

          {Object.entries(groupVariants(group.variants)).map(([colore, taglieObj], idxColore) => (
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
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Venduto<br/>(ultimi {periodDays} gg)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Stock attuale</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Giorni rimanenti</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: 16 }}>Suggerimento acquisto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(taglieObj)
                      .sort(([tagliaA], [tagliaB]) => {
                        const iA = TAGLIE_ORDINATE.indexOf(tagliaA.toLowerCase());
                        const iB = TAGLIE_ORDINATE.indexOf(tagliaB.toLowerCase());
                        if (iA === -1 && iB === -1) return tagliaA.localeCompare(tagliaB);
                        if (iA === -1) return 1;
                        if (iB === -1) return -1;
                        return iA - iB;
                      })
                      .map(([taglia, vars]) => {
                        const v = vars[0];
                        const dailyConsumption = v.venduto / periodDays;
                        const daysRemaining =
                          dailyConsumption > 0 ? Math.floor((v.stock ?? 0) / dailyConsumption) : "∞";
                        const purchaseSuggestion =
                          dailyConsumption > 0
                            ? Math.max(0, Math.ceil(dailyConsumption * 30 - (v.stock ?? 0)))
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
                            <TableCell sx={{ fontWeight: 600, fontSize: 17, textTransform: "uppercase" }}>{taglia}</TableCell>
                            <TableCell align="center">
                              <Chip label={v.venduto} color="primary" variant="outlined" size="medium" sx={{ fontWeight: 700, fontSize: 15 }}/>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={v.stock}
                                color={
                                  v.stock === 0
                                    ? "error"
                                    : v.stock <= 5
                                    ? "warning"
                                    : "success"
                                }
                                variant="filled"
                                size="medium"
                                sx={{ fontWeight: 700, fontSize: 15 }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{
                              fontWeight: 700,
                              color:
                                typeof daysRemaining === "number" && daysRemaining <= 7
                                  ? "#d93025"
                                  : "#006400",
                              fontSize: 16,
                            }}>
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
      ))}
    </Box>
  );
}