import React, { useEffect, useState } from 'react';
import { getProduzione } from '@/utils/shopify';
import RigaProduzione from './components/RigaProduzione';
import OrderPopup from './components/OrderPopup';

interface Riga {
  variant_id: number;
  order_name: string;
  prodotto: string;
  taglia: string;
  colore: string;
  coloreHex: string;
  grafica: string;
  immagine: string;
  shopify_order_id?: string;
  indirizzo?: string;
}

export default function ProduzionePage() {
  const [righe, setRighe] = useState<Riga[]>([]);
  const [stampati, setStampati] = useState<{ [variant_id: number]: boolean }>({});
  const [popupOrder, setPopupOrder] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getProduzione();
      setRighe(data);
    };
    fetchData();
  }, []);

  const handleEvadi = (variantId: number) => {
    setStampati(prev => ({ ...prev, [variantId]: true }));
    setPopupOrder(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Produzione</h1>
      <div className="space-y-2">
        {righe.map((riga) => (
          <div key={`${riga.variant_id}-${riga.order_name}`} className={
            `flex items-center justify-between p-4 rounded-lg shadow-md transition-opacity ${stampati[riga.variant_id] ? 'opacity-40' : 'opacity-100'}`
          }>
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: riga.coloreHex }}></div>
              <div>
                <div className="font-bold">{riga.prodotto}</div>
                <div className="text-sm font-semibold">{riga.taglia} - {riga.colore}</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <img src={riga.immagine} alt="anteprima" className="w-16 h-16 object-cover rounded" />
              <button
                className="bg-black text-white px-4 py-2 rounded shadow hover:bg-gray-800"
                onClick={() => setPopupOrder(riga.order_name)}
              >
                Gestisci ordine
              </button>
            </div>
          </div>
        ))}
      </div>

      {popupOrder && (() => {
        const ordine = righe.find(r => r.order_name === popupOrder);
        if (!ordine) return null;

        return (
          <OrderPopup
            ordine={{
              ...ordine,
              shopify_order_id: ordine.shopify_order_id || '',
              indirizzo: ordine.indirizzo || '',
            }}
            onClose={() => setPopupOrder(null)}
            onEvadi={() => handleEvadi(ordine.variant_id)}
          />
        );
      })()}
    </div>
  );
}