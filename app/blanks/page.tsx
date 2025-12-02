"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  TextField,
  Grid,
  Typography,
  Paper,
  Stack,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import {
  Inventory2,
  Warning,
  CheckCircle,
  Cancel,
  Search,
} from "@mui/icons-material";

const COLOR_MAP: Record<string, string> = {
  nero: "#000000",
  bianco: "#FFFFFF",
  navy: "#001F3F",
  "dark grey": "#4A5568",
  "sport grey": "#A0AEC0",
  grigio: "#718096",
  panna: "#F7FAFC",
  sand: "#D4C5B9",
  army: "#4A5043",
  bordeaux: "#722F37",
  "night blue": "#1A365D",
  rosso: "#DC2626",
  blu: "#2563EB",
  verde: "#16A34A",
  giallo: "#EAB308",
  rosa: "#EC4899",
  royal: "#2C5AA0",
  viola: "#7C3AED",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function BlanksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
        if (!res.ok) throw new Error("Errore nel caricamento dei dati");
        const json = await res.json();
        setData(json.blanks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    let totalVariants = 0;
    let outOfStock = 0;
    let lowStock = 0;

    data.forEach((blank) => {
      blank.inventory.forEach((v: any) => {
        totalVariants++;
        if (v.stock === 0) outOfStock++;
        else if (v.stock > 0 && v.stock <= 5) lowStock++;
      });
    });

    return { totalVariants, outOfStock, lowStock };
  }, [data]);

  const filteredData = useMemo(() => {
    return data
      .map((blank) => ({
        ...blank,
        inventory: blank.inventory
          .filter((v: any) => {
            const matchSearch =
              blank.blank_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.colore.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.taglia.toLowerCase().includes(searchTerm.toLowerCase());

            const matchStock =
              filterStock === "all" ||
              (filterStock === "out" && v.stock === 0) ||
              (filterStock === "low" && v.stock > 0 && v.stock <= 5);

            return matchSearch && matchStock;
          })
          .sort((a: any, b: any) => {
            const sizeA = SIZE_ORDER.indexOf(a.taglia.toUpperCase());
            const sizeB = SIZE_ORDER.indexOf(b.taglia.toUpperCase());
            if (sizeA !== sizeB) return sizeA - sizeB;
            return a.colore.localeCompare(b.colore);
          }),
      }))
      .filter((blank) => blank.inventory.length > 0);
  }, [data, searchTerm, filterStock]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Caricamento stock...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 8 }}>
        <Alert severity="error" variant="filled">
          <Typography variant="h6" gutterBottom>
            Errore nel caricamento
          </Typography>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", pb: 4 }}>
      {/* Header con Stats */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 0 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Inventory2 sx={{ fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Gestione Stock Blanks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitoraggio inventario prodotti base
              </Typography>
            </Box>
          </Stack>

          {/* Stats Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Paper elevation={2} sx={{ p: 2, bgcolor: "primary.50" }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    <Inventory2 />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {stats.totalVariants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Varianti Totali
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper elevation={2} sx={{ p: 2, bgcolor: "warning.50" }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "warning.main" }}>
                    <Warning />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {stats.lowStock}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Stock Basso
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper elevation={2} sx={{ p: 2, bgcolor: "error.50" }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "error.main" }}>
                    <Cancel />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      {stats.outOfStock}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Esauriti
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Filtri */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              placeholder="Cerca per prodotto, colore o taglia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
              }}
              variant="outlined"
            />

            <ToggleButtonGroup
              value={filterStock}
              exclusive
              onChange={(_, value) => value && setFilterStock(value)}
              sx={{ flexShrink: 0 }}
            >
              <ToggleButton value="all">Tutti</ToggleButton>
              <ToggleButton value="low">Stock Basso</ToggleButton>
              <ToggleButton value="out">Esauriti</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3 }}>
        {filteredData.length === 0 ? (
          <Paper elevation={1} sx={{ p: 6, textAlign: "center" }}>
            <Search sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              Nessun risultato trovato
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Prova a modificare i filtri di ricerca
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredData.map((blank) => (
              <Grid item xs={12} lg={6} key={blank.blank_key}>
                <Card elevation={3}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: "primary.main" }}>
                        <Inventory2 />
                      </Avatar>
                    }
                    title={
                      <Typography variant="h6" fontWeight="bold" textTransform="capitalize">
                        {blank.blank_key.replaceAll("_", " ")}
                      </Typography>
                    }
                    subheader={`${blank.inventory.length} varianti disponibili`}
                    sx={{ bgcolor: "primary.50" }}
                  />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={1.5}>
                      {blank.inventory.map((v: any) => (
                        <Grid item xs={6} sm={4} md={3} key={v.id}>
                          <Tooltip
                            title={`${v.colore} - ${v.taglia} | Stock: ${v.stock}`}
                            arrow
                          >
                            <Paper
                              elevation={1}
                              sx={{
                                p: 1.5,
                                textAlign: "center",
                                transition: "all 0.2s",
                                cursor: "pointer",
                                border: 2,
                                borderColor:
                                  v.stock === 0
                                    ? "error.light"
                                    : v.stock <= 5
                                    ? "warning.light"
                                    : "success.light",
                                bgcolor:
                                  v.stock === 0
                                    ? "error.50"
                                    : v.stock <= 5
                                    ? "warning.50"
                                    : "success.50",
                                "&:hover": {
                                  transform: "translateY(-4px)",
                                  boxShadow: 4,
                                },
                              }}
                            >
                              {/* Colore */}
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                justifyContent="center"
                                mb={1}
                              >
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    bgcolor: COLOR_MAP[v.colore] || "#CCC",
                                    border: "2px solid",
                                    borderColor: "grey.400",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  fontWeight="medium"
                                  textTransform="capitalize"
                                  noWrap
                                  sx={{ maxWidth: 60 }}
                                >
                                  {v.colore}
                                </Typography>
                              </Stack>

                              {/* Taglia */}
                              <Typography variant="h6" fontWeight="bold" mb={1}>
                                {v.taglia}
                              </Typography>

                              {/* Stock Badge */}
                              <Chip
                                label={v.stock === 0 ? "OUT" : v.stock}
                                size="small"
                                icon={
                                  v.stock === 0 ? (
                                    <Cancel />
                                  ) : v.stock <= 5 ? (
                                    <Warning />
                                  ) : (
                                    <CheckCircle />
                                  )
                                }
                                color={
                                  v.stock === 0
                                    ? "error"
                                    : v.stock <= 5
                                    ? "warning"
                                    : "success"
                                }
                                sx={{ fontWeight: "bold" }}
                              />
                            </Paper>
                          </Tooltip>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
