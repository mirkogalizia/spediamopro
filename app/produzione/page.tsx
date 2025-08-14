"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

export default function ProduzionePage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!date?.from || !date?.to) return;
    setLoading(true);
    const res = await fetch("/api/produzione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: date.from, to: date.to }),
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  return (
    <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
      <Card style={{ width: "100%", maxWidth: 1400 }}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold mb-2">Produzione</CardTitle>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-[300px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <span>
                        {format(date.from, "dd MMM yyyy", { locale: it })} -{" "}
                        {format(date.to, "dd MMM yyyy", { locale: it })}
                      </span>
                    ) : (
                      format(date.from, "dd MMM yyyy", { locale: it })
                    )
                  ) : (
                    <span>Seleziona un intervallo</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={new Date()}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={fetchData} disabled={!date?.from || !date?.to || loading}>
              {loading ? "Caricamento..." : "Carica ordini"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordine</TableHead>
                <TableHead>Prodotto</TableHead>
                <TableHead>Colore</TableHead>
                <TableHead>Taglia</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Stampato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.orderNumber}</TableCell>
                  <TableCell>{item.productType}</TableCell>
                  <TableCell>{item.color}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt="Preview"
                        style={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    ) : (
                      <span style={{ fontStyle: "italic", color: "#999" }}>
                        Nessuna immagine
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <input type="checkbox" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}