"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

export default function BlanksDashboard() {
  const [mapping, setMapping] = useState<any[]>([]);
  const [stock, setStock] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------
  //  FETCH: mapping categorie → blanks
  // -------------------------------------------------------
  const loadMapping = async () => {
    const res = await fetch("/api/shopify2/catalog/create-mapping", {
      method: "GET",
    });
    const data = await res.json();
    if (data.mapping) setMapping(data.mapping);
  };

  // -------------------------------------------------------
  //  FETCH: stock blanks
  // -------------------------------------------------------
  const loadStock = async () => {
    const res = await fetch("/api/shopify2/catalog/full", {
      method: "GET",
    });
    const data = await res.json();
    if (data.stock) setStock(data.stock);
  };

  // -------------------------------------------------------
  //  FIRST LOAD
  // -------------------------------------------------------
  useEffect(() => {
    loadMapping();
    loadStock();
  }, []);

  // -------------------------------------------------------
  //  AZIONI
  // -------------------------------------------------------

  const reScanCatalog = async () => {
    setRefreshing(true);
    await fetch("/api/shopify2/catalog/scan");
    await loadMapping();
    setRefreshing(false);
  };

  const rebuildBlanksStock = async () => {
    setRefreshing(true);
    await fetch("/api/shopify2/catalog/build-blanks-stock");
    await loadStock();
    setRefreshing(false);
  };

  return (
    <div className="p-8 flex flex-col gap-10">
      {/* -------------------------------------------------------
         TITOLO STILE REVOLUT
      -------------------------------------------------------- */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold tracking-tight text-[#0f172a]"
      >
        Blanks Dashboard
      </motion.h1>

      {/* -------------------------------------------------------
         SEZIONE AZIONI (CARDS REVOLUT)
      -------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl shadow-lg hover:shadow-xl transition bg-white">
            <CardContent className="p-6 flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Ricarica Catalogo</h2>
              <p className="text-sm text-gray-500">Scarica tutti i prodotti dal tuo Shopify.</p>
              <Button onClick={reScanCatalog} disabled={refreshing}>
                {refreshing ? "Caricamento..." : "Ricarica Catalogo →"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl shadow-lg hover:shadow-xl transition bg-white">
            <CardContent className="p-6 flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Rigenera Mapping</h2>
              <p className="text-sm text-gray-500">Ricalcola associazioni categoria → blank.</p>
              <Button onClick={loadMapping}>Rigenera Mapping →</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl shadow-lg hover:shadow-xl transition bg-white">
            <CardContent className="p-6 flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Aggiorna Stock</h2>
              <p className="text-sm text-gray-500">Legge i BLANK da Shopify e aggiorna Firestore.</p>
              <Button onClick={rebuildBlanksStock}>Aggiorna Stock →</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* -------------------------------------------------------
         MAPPING CATEGORIE → BLANKS
      -------------------------------------------------------- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Mapping Categorie</h2>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Blank</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Assegnato</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {mapping.map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.category}</TableCell>
                    <TableCell>{m.blank_key ?? "—"}</TableCell>
                    <TableCell>{m.product_id ?? "—"}</TableCell>
                    <TableCell>
                      {m.blank_assigned ? (
                        <span className="text-green-600 font-semibold">✔️ Si</span>
                      ) : (
                        <span className="text-red-500 font-semibold">❌ No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* -------------------------------------------------------
         STOCK BLANKS
      -------------------------------------------------------- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Stock BLANKS</h2>

            {Object.keys(stock).length === 0 ? (
              <p className="text-gray-500">Nessuno stock trovato. Premi “Aggiorna Stock”.</p>
            ) : (
              Object.entries(stock).map(([blankKey, variants]: any) => (
                <div key={blankKey} className="mb-10">
                  <h3 className="text-xl font-semibold mb-3 capitalize">{blankKey}</h3>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Taglia</TableHead>
                        <TableHead>Colore</TableHead>
                        <TableHead>Stock</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {Object.values(variants).map((v: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{v.taglia}</TableCell>
                          <TableCell className="capitalize">{v.colore}</TableCell>
                          <TableCell className="font-semibold">{v.stock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}