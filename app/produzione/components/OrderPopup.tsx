"use client";

import { useEffect, useState } from "react";
import { removeAccents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function OrderPopup({ orderName, onClose, onEvadi }: { orderName: string, onClose: () => void, onEvadi: () => void }) {
  const [form, setForm] = useState({
    nome: "",
    telefono: "",
    email: "",
    indirizzo: "",
    indirizzo2: "",
    capDestinatario: "",
    cittaDestinatario: "",
    provinciaDestinatario: "",
    nazioneDestinatario: "",
    corriere: "",
    orderName,
  });
  const [corrieri, setCorrieri] = useState<string[]>([]);
  const [etichetta, setEtichetta] = useState<string>("");
  const [errore, setErrore] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hadir = async () => {
      try {
        const res = await fetch(`/api/shopify?name=${encodeURIComponent(orderName)}`);
        const { orders } = await res.json();
        const ord = orders?.[0];
        if (!ord) {
          setErrore("Ordine non trovato");
          return;
        }

        const ship = ord.shipping_address || {};
        setForm(f => ({
          ...f,
          nome: `${ship.first_name || ""} ${ship.last_name || ""}`.trim(),
          telefono: ship.phone || "",
          email: ord.email || "",
          indirizzo: removeAccents(ship.address1 || ""),
          indirizzo2: removeAccents(ship.address2 || ""),
          capDestinatario: ship.zip || "",
          cittaDestinatario: removeAccents(ship.city || ""),
          provinciaDestinatario: ship.country_code === "IT" ? ship.province_code || "" : ship.province || ship.province_code || "",
          nazioneDestinatario: ship.country_code || "",
        }));
      } catch (e) {
        console.error(e);
        setErrore("Errore nel caricamento ordine");
      }
    };
    hadir();
  }, [orderName]);

  const simula = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spediamo?step=simulate", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data?.data?.tariffs) {
        setCorrieri(data.data.tariffs.map((c: any) => c.carrier_name));
      }
    } catch (err) {
      setErrore("Errore nella simulazione");
    } finally {
      setLoading(false);
    }
  };

  const creaSpedizione = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spediamo?step=create", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data?.data?.tracking_number && data?.data?.label_url) {
        setEtichetta(data.data.label_url);
      } else {
        setErrore("Errore nella creazione della spedizione");
      }
    } catch (err) {
      setErrore("Errore nella creazione della spedizione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl p-6 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gestione ordine: {orderName}</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {errore && <p className="text-red-500 mb-4">{errore}</p>}

        {!etichetta ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium">Corriere</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={form.corriere}
                  onChange={e => setForm(f => ({ ...f, corriere: e.target.value }))}
                >
                  <option value="">Seleziona</option>
                  {corrieri.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <Button onClick={simula} disabled={loading}>Simula {loading && <Loader2 className="animate-spin ml-2 w-4 h-4" />}</Button>
              <Button onClick={creaSpedizione} disabled={loading}>Crea e Paga {loading && <Loader2 className="animate-spin ml-2 w-4 h-4" />}</Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <a href={etichetta} target="_blank" className="text-blue-600 underline block">Scarica Lettera di Vettura</a>
            <Button onClick={onEvadi}>Evadi Ordine</Button>
          </div>
        )}
      </div>
    </div>
  );
}