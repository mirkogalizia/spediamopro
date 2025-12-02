'use client';

import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";

interface Variant {
  id: string;
  taglia: string;
  colore: string;
  stock: number;
}

interface BlankGroup {
  blank_key: string;
  inventory: Variant[];
}

export default function BlanksPage() {
  const [data, setData] = useState<BlankGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState<{ [key: string]: number }>({});

  async function loadStock() {
    setLoading(true);
    const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
    const json = await res.json();
    setData(json.blanks || []);
    setLoading(false);
  }

  async function updateStock(variantId: string, blankKey: string) {
    const value = newStock[variantId];
    if (value == null || value === "") return alert("Inserisci un valore!");

    await fetch("/api/shopify2/catalog/sync-blanks-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blank_key: blankKey,
        variant_id: variantId,
        new_stock: Number(value),
      }),
    });

    await loadStock();
  }

  useEffect(() => {
    loadStock();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      <h1 className="text-4xl font-bold text-center mb-8 flex items-center justify-center gap-2">
        📦 Stock Blanks
      </h1>

      {loading && <p className="text-center text-xl">Caricamento...</p>}

      {!loading &&
        data.map((group) => {
          // Raggruppo per colore
          const colors: Record<string, Variant[]> = {};

          group.inventory.forEach((v) => {
            if (!colors[v.colore]) colors[v.colore] = [];
            colors[v.colore].push(v);
          });

          return (
            <Card key={group.blank_key} className="mb-10 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-3xl font-semibold mb-4 capitalize">
                  {group.blank_key.replace("-", " ")}
                </h2>
                <Separator className="my-4" />

                {Object.entries(colors).map(([colore, variants]) => (
                  <div key={colore} className="mb-8">
                    <h3 className="text-xl font-semibold mb-3 capitalize flex items-center gap-2">
                      🎨 {colore}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {variants.map((v) => (
                        <Card key={v.id} className="p-4 border shadow-sm">
                          <div className="flex justify-between">
                            <div>
                              <p className="text-lg font-semibold uppercase">{v.taglia}</p>
                              <p className="text-gray-600 mt-1">Stock: {v.stock}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-3">
                            <Input
                              type="number"
                              className="w-24"
                              placeholder="Qty"
                              onChange={(e) =>
                                setNewStock((prev) => ({
                                  ...prev,
                                  [v.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              onClick={() => updateStock(v.id, group.blank_key)}
                              className="bg-blue-600 text-white"
                            >
                              Aggiorna
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}