// app/components/dashboard/ShipmentFlipCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CreditCard, ArrowRight } from 'lucide-react';

type Step = 'import' | 'address' | 'carrier' | 'payment' | 'success';

export function ShipmentFlipCard() {
  const [step, setStep] = useState<Step>('import');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderQuery, setOrderQuery] = useState('');
  const [carriers, setCarriers] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carica ordini
  const handleLoadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopify2?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStep('address');
      }
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cerca e importa ordine
  const handleSearchOrder = () => {
    const found = orders.find(o => 
      o.name.toLowerCase().includes(orderQuery.toLowerCase())
    );
    if (found) {
      setSelectedOrder(found);
      setStep('carrier');
    }
  };

  // Simula spedizione
  const handleSimulate = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const ship = selectedOrder.shipping_address;
      const res = await fetch('/api/spediamo?step=simula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capDestinatario: ship.zip,
          cittaDestinatario: ship.city,
          provinciaDestinatario: ship.province_code,
          nazioneDestinatario: ship.country_code,
          altezza: '10',
          larghezza: '15',
          profondita: '20',
          peso: '1'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCarriers(data.simulazione?.spedizioni || []);
        setStep('payment');
      }
    } catch (error) {
      console.error('Errore simulazione:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crea e paga
  const handleCreateAndPay = async (carrierId) => {
    setLoading(true);
    try {
      const resC = await fetch(`/api/spediamo2?step=create&id=${carrierId}&shopifyOrderId=${selectedOrder.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consigneePickupPointId: null })
      });
      
      if (resC.ok) {
        const { spedizione } = await resC.json();
        
        // Update indirizzo
        const ship = selectedOrder.shipping_address;
        await fetch(`/api/spediamo?step=update&id=${spedizione.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: `${ship.first_name} ${ship.last_name}`,
            telefono: ship.phone,
            email: selectedOrder.email,
            indirizzo: ship.address1,
            capDestinatario: ship.zip,
            cittaDestinatario: ship.city,
            provinciaDestinatario: ship.province_code
          })
        });
        
        // Paga
        await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: 'POST' });
        
        setStep('success');
        
        // Reset dopo 3 secondi mantenendo le date
        setTimeout(() => {
          setStep('import');
          setSelectedOrder(null);
          setOrderQuery('');
          setCarriers([]);
        }, 3000);
      }
    } catch (error) {
      console.error('Errore creazione spedizione:', error);
    } finally {
      setLoading(false);
    }
  };

  // Varianti animazione flip
  const flipVariants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      opacity: 0
    }),
    center: {
      rotateY: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      rotateY: direction > 0 ? -90 : 90,
      opacity: 0
    })
  };

  return (
    <div className="perspective-1000" style={{ perspective: '1000px' }}>
      <div className="relative w-full h-[500px]">
        <AnimatePresence mode="wait" custom={1}>
          {step === 'import' && (
            <motion.div
              key="import"
              custom={1}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/10 border border-white/50"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Importa Ordine</h2>
                  <p className="text-sm text-slate-600">Seleziona periodo</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Da</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">A</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-medium"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLoadOrders}
                  disabled={loading}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Caricamento...' : (
                    <>
                      Carica Ordini <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'address' && (
            <motion.div
              key="address"
              custom={1}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/10 border border-white/50"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Cerca Ordine</h2>
                  <p className="text-sm text-slate-600">{orders.length} ordini caricati</p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Numero ordine (es. #1001)"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-medium"
                />

                <button
                  onClick={handleSearchOrder}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Importa Indirizzo <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setStep('import')}
                  className="w-full text-slate-600 hover:text-slate-900 py-2"
                >
                  ← Torna indietro
                </button>
              </div>
            </motion.div>
          )}

          {step === 'carrier' && selectedOrder && (
            <motion.div
              key="carrier"
              custom={1}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/10 border border-white/50"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Indirizzo Caricato</h2>
                  <p className="text-sm text-slate-600">Ordine {selectedOrder.name}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-sm">
                <p className="font-semibold">{selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}</p>
                <p>{selectedOrder.shipping_address?.address1}</p>
                <p>{selectedOrder.shipping_address?.zip} {selectedOrder.shipping_address?.city}</p>
              </div>

              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Simulazione...' : (
                  <>
                    Simula Spedizione <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              custom={1}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/10 border border-white/50 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Scegli Corriere</h2>
                  <p className="text-sm text-slate-600">{carriers.length} opzioni disponibili</p>
                </div>
              </div>

              <div className="space-y-3">
                {carriers.map((carrier) => (
                  <button
                    key={carrier.id}
                    onClick={() => handleCreateAndPay(carrier.id)}
                    disabled={loading}
                    className="w-full bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-slate-600" />
                      <span className="font-semibold">{carrier.corriere}</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{parseFloat(carrier.tariffa).toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              custom={1}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 shadow-2xl flex items-center justify-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-6xl mb-4"
                >
                  ✅
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Spedizione Creata!</h2>
                <p className="text-green-100">Ritorno al menu principale...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
