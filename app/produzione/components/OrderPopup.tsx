"use client";

import { useEffect, useState } from "react";
import { RigaProduzione } from "./columns";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createLDV, evadiOrdine, getSpedizioneSimulata, getTrackingUrl, simulateOrder } from "@/utils/spediamo";

interface OrderPopupProps {
  ordine: RigaProduzione & {
    shopify_order_id: string;
    indirizzo: string;
  };
  onClose: () => void;
  onEvadi: () => void;
}

export default function OrderPopup({ ordine, onClose, onEvadi }: OrderPopupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [simulazione, setSimulazione] = useState<any>(null);
  const [selectedCorriere, setSelectedCorriere] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);

  useEffect(() => {
    const simulate = async () => {
      try {
        const response = await simulateOrder(ordine.shopify_order_id);
        setSimulazione(response);
      } catch (err) {
        console.error("Errore nella simulazione:", err);
      }
    };
    simulate();
  }, [ordine.shopify_order_id]);

  const handleCreate = async () => {
    if (!selectedCorriere) return;
    setIsLoading(true);
    try {
      const spedizione = simulazione.find((s: any) => s.nome === selectedCorriere);
      const creata = await createLDV({
        shopifyOrderId: ordine.shopify_order_id,
        corriere: selectedCorriere,
        spedizioneId: spedizione.id,
      });
      setLabelUrl(creata.labelUrl);
      const tracking = await getTrackingUrl(ordine.shopify_order_id);
      setTrackingUrl(tracking);
    } catch (err) {
      console.error("Errore nella creazione:", err);
    }
    setIsLoading(false);
  };

  const handleEvadi = async () => {
    if (!trackingUrl) return;
    setIsLoading(true);
    try {
      await evadiOrdine({
        shopifyOrderId: ordine.shopify_order_id,
        trackingUrl: trackingUrl,
        corriere: selectedCorriere || "",
      });
      onEvadi();
      onClose();
    } catch (err) {
      console.error("Errore nell'evasione:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-[90vw] max-w-2xl relative">
        <div className="absolute top-3 right-3">
          <button onClick={onClose}>✕</button>
        </div>

        <h2 className="text-xl font-bold mb-4">Gestione ordine {ordine.order_name}</h2>

        <p className="text-sm text-gray-600 mb-4">{ordine.indirizzo}</p>

        {simulazione === null ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin w-4 h-4" />
            <span>Simulazione in corso…</span>
          </div>
        ) : labelUrl ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <a href={labelUrl} target="_blank" className="text-blue-600 underline">Stampa Lettera di Vettura</a>
              {trackingUrl && <a href={trackingUrl} target="_blank" className="text-blue-600 underline">Tracking</a>}
            </div>
            <Button onClick={handleEvadi} disabled={isLoading}>
              ✅ Evadi ordine
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {simulazione.map((s: any) => (
                <Card
                  key={s.nome}
                  onClick={() => setSelectedCorriere(s.nome)}
                  className={`cursor-pointer border-2 ${selectedCorriere === s.nome ? "border-black" : "border-transparent"}`}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-semibold">{s.nome}</div>
                      <div className="text-xs text-gray-500">{s.prezzo}€</div>
                    </div>
                    <Truck className="w-5 h-5 text-gray-400" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={handleCreate} disabled={!selectedCorriere || isLoading}>
              📦 Crea spedizione
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}