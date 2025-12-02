"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";

const COLOR_MAP: Record<string, string> = {
  nero: "#000000",
  bianco: "#FFFFFF",
  navy: "#001F3F",
  "dark grey": "#4A5568",
  "sport grey": "#A0AEC0",
  panna: "#F7FAFC",
  sand: "#D4C5B9",
  army: "#4A5043",
  royal: "#2C5AA0",
  bordeaux: "#722F37",
  verde: "#15803d",
  blu: "#2563eb",
  rosa: "#ec4899",
  rosso: "#dc2626",
  "night blue": "#1A365D",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function BlanksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/shopify2/catalog/blanks-stock-view");
      const json = await res.json();
      setData(json.blanks || []);
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    let total = 0, low = 0, out = 0;

    data.forEach((b) =>
      b.inventory.forEach((v: any) => {
        total++;
        if (v.stock === 0) out++;
        else if (v.stock <= 5) low++;
      })
    );

    return { total, low, out };
  }, [data]);

  const filtered = useMemo(() => {
    return data
      .map((b) => ({
        ...b,
        inventory: b.inventory
          .filter((v: any) => {
            const match =
              b.blank_key.includes(search.toLowerCase()) ||
              v.colore.includes(search.toLowerCase()) ||
              v.taglia.includes(search.toUpperCase());

            const stockMatch =
              filterStock === "all" ||
              (filterStock === "out" && v.stock === 0) ||
              (filterStock === "low" && v.stock <= 5);

            return match && stockMatch;
          })
          .sort((a: any, b: any) => {
            const sA = SIZE_ORDER.indexOf(a.taglia);
            const sB = SIZE_ORDER.indexOf(b.taglia);
            if (sA !== sB) return sA - sB;
            return a.colore.localeCompare(b.colore);
          }),
      }))
      .filter((b) => b.inventory.length > 0);
  }, [data, search, filterStock]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-gray-300 border-t-black rounded-full" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* HEADER */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blanks Stock</h1>
              <p className="text-gray-500">Inventario base sincronizzato</p>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <StatCard label="Varianti" value={stats.total} color="blue" />
              <StatCard label="Stock basso" value={stats.low} color="yellow" />
              <StatCard label="Esauriti" value={stats.out} color="red" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="flex-1">
              <Input
                placeholder="Cerca colore, taglia o categoria…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            <div className="flex gap-2">
              <FilterButton
                active={filterStock === "all"}
                onClick={() => setFilterStock("all")}
              >
                Tutti
              </FilterButton>
              <FilterButton
                active={filterStock === "low"}
                onClick={() => setFilterStock("low")}
              >
                Stock basso
              </FilterButton>
              <FilterButton
                active={filterStock === "out"}
                onClick={() => setFilterStock("out")}
              >
                Esauriti
              </FilterButton>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((blank) => (
            <Card
              key={blank.blank_key}
              className="p-0 overflow-hidden border shadow-md hover:shadow-lg transition-all"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#202A44] to-[#171E2E] px-6 py-4">
                <h2 className="text-xl font-semibold text-white capitalize flex items-center gap-2">
                  {blank.blank_key.replaceAll("_", " ")}
                </h2>
                <p className="text-gray-300 text-sm">
                  {blank.inventory.length} varianti
                </p>
              </div>

              {/* Grid Variants */}
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {blank.inventory.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all"
                    >
                      {/* color */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor: COLOR_MAP[v.colore] || "#ccc",
                          }}
                        />
                        <span className="text-xs text-gray-700 capitalize">
                          {v.colore}
                        </span>
                      </div>

                      {/* taglia */}
                      <div className="text-center font-semibold text-gray-900">
                        {v.taglia}
                      </div>

                      {/* stock */}
                      <div className="mt-2 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-bold text-white ${
                            v.stock === 0
                              ? "bg-red-500"
                              : v.stock <= 5
                              ? "bg-yellow-500"
                              : "bg-green-600"
                          }`}
                        >
                          {v.stock === 0 ? "OUT" : v.stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- COMPONENTS -------------------- */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "yellow" | "red";
}) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div
      className={`px-4 py-3 rounded-xl border shadow-sm text-center ${colors[color]}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      onClick={onClick}
      className={`h-12 px-5 rounded-xl font-medium ${
        active
          ? "bg-black text-white shadow-lg"
          : "bg-white text-gray-700 border hover:bg-gray-100"
      }`}
      variant={"outline"}
    >
      {children}
    </Button>
  );
}