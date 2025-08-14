"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

interface OrderPopupProps {
  orderName: string;
  onClose: () => void;
  onEvadi: () => void;
}

export default function OrderPopup({ orderName, onClose, onEvadi }: OrderPopupProps) {
  const [data, setData] = useState<any>(null);
  const [step, setStep] = useState("fetch");
  const [selectedCorriere, setSelectedCorriere] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const res = await fetch(`/api/spediamo?step=fetch&shopifyOrderName=${orderName}`);
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData();
  }, [orderName]);

  const simula = async () => {
    if (!selectedCorriere) return;
    setLoading(true);
    const res = await fetch(`/api/spediamo?step=simulate&id=${data?.id}&corriere=${selectedCorriere}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    setStep("simulato");
  };

  const crea = async () => {
    setLoading(true);
    const res = await fetch(`/api/spediamo?step=create&id=${data?.id}&shopifyOrderId=${data?.shopifyOrderId}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    setStep("creato");
  };

  const paga = async () => {
    setLoading(true);
    const res = await fetch(`/api/spediamo?step=pay&id=${data?.id}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    setStep("pagato");
  };

  const evadi = async () => {
    setLoading(true);
    const res = await fetch(`/api/spediamo?step=evadi&id=${data?.id}&shopifyOrderId=${data?.shopifyOrderId}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    setStep("evaso");
    onEvadi();
  };

  return (
    <motion.div
      className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-50 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500">✕</button>
        <h2 className="text-xl font-bold mb-4">Gestione ordine {orderName}</h2>

        {!data ? (
          <p>Caricamento dati ordine...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p><strong>Destinatario:</strong> {data.nome} {data.cognome}</p>
              <p><strong>Indirizzo:</strong> {data.indirizzo}, {data.cap} {data.citta} ({data.provincia})</p>
            </div>

            {step === "fetch" && (
              <>
                <div>
                  <label className="block mb-1 font-medium">Seleziona Corriere</label>
                  <select value={selectedCorriere ?? ""} onChange={e => setSelectedCorriere(e.target.value)} className="border rounded p-2 w-full">
                    <option value="">-- Seleziona --</option>
                    <option value="poste">Poste Italiane</option>
                    <option value="brt">BRT</option>
                    <option value="gls">GLS</option>
                  </select>
                </div>
                <button onClick={simula} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" disabled={!selectedCorriere || loading}>
                  Simula Spedizione
                </button>
              </>
            )}

            {step === "simulato" && (
              <button onClick={crea} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" disabled={loading}>
                Crea spedizione
              </button>
            )}

            {step === "creato" && (
              <button onClick={paga} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded" disabled={loading}>
                Paga spedizione
              </button>
            )}

            {step === "pagato" && (
              <>
                {data?.tracking_url && (
                  <a href={data.tracking_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    ➜ Stampa Lettera di Vettura
                  </a>
                )}
                <button onClick={evadi} className="bg-black text-white px-4 py-2 rounded mt-2" disabled={loading}>
                  Evadi ordine su Shopify
                </button>
              </>
            )}

            {step === "evaso" && <p className="text-green-600">Ordine evaso con successo ✅</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}