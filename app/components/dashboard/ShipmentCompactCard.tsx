// app/components/dashboard/ShipmentCompactCard.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, ArrowRight, Edit2 } from 'lucide-react';

type Step = 'import' | 'simulate' | 'carriers' | 'success';

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ShipmentCompactCard() {
  const [step, setStep] = useState<Step>('import');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState([]);
  const [orderQuery, setOrderQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    nome: '',
    telefono: '',
    email: '',
    indirizzo: '',
    indirizzo2: '',
    capDestinatario: '',
    cittaDestinatario: '',
    provinciaDestinatario: '',
    nazioneDestinatario: '',
    altezza: '10',
    larghezza: '15',
    profondita: '20',
    peso: '1',
  });

  // Carica ordini
  const handleLoadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopify2?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cerca ordine
  const handleSearchOrder = () => {
    const term = orderQuery.trim().toLowerCase();
    const found = orders.find(o => {
      const plainName = (o.name || '').toLowerCase().replace(/#/g, '');
      return plainName.includes(term);
    });
    
    if (found) {
      setSelectedOrder(found);
      const ship = found.shipping_address || {};
      setForm({
        nome: `${ship.first_name || ''} ${ship.last_name || ''}`.trim(),
        telefono: ship.phone || '',
        email: found.email || '',
        indirizzo: removeAccents(ship.address1 || ''),
        indirizzo2: removeAccents(ship.address2 || ''),
        capDestinatario: ship.zip || '',
        cittaDestinatario: removeAccents(ship.city || ''),
        provinciaDestinatario: ship.province_code || '',
        nazioneDestinatario: ship.country_code || '',
        altezza: '10',
        larghezza: '15',
        profondita: '20',
        peso: '1',
      });
      setStep('simulate');
    }
  };

  // Simula
  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spediamo?step=simula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capDestinatario: form.capDestinatario,
          cittaDestinatario: form.cittaDestinatario,
          provinciaDestinatario: form.provinciaDestinatario,
          nazioneDestinatario: form.nazioneDestinatario,
          altezza: form.altezza,
          larghezza: form.larghezza,
          profondita: form.profondita,
          peso: form.peso,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCarriers(data.simulazione?.spedizioni || []);
        setStep('carriers');
      }
    } catch (error) {
      console.error('Errore:', error);
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
        
        await fetch(`/api/spediamo?step=update&id=${spedizione.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: form.nome,
            telefono: form.telefono,
            email: form.email,
            indirizzo: form.indirizzo,
            indirizzo2: form.indirizzo2,
            capDestinatario: form.capDestinatario,
            cittaDestinatario: form.cittaDestinatario,
            provinciaDestinatario: form.provinciaDestinatario,
          })
        });
        
        await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: 'POST' });
        
        setStep('success');
        
        setTimeout(() => {
          setStep('import');
          setSelectedOrder(null);
          setOrderQuery('');
          setCarriers([]);
        }, 2500);
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  const flipVariants = {
    enter: { rotateY: 90, opacity: 0 },
    center: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 }
  };

  return (
    <div style={{ perspective: '1200px' }}>
      <div className="relative w-full h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Import */}
          {step === 'import' && (
            <motion.div
              key="import"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Importa Ordine</h3>
                  <p className="text-xs text-slate-600">Seleziona periodo</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Da</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">A</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLoadOrders}
                  disabled={loading}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-3 rounded-xl transition-all text-sm"
                >
                  {loading ? 'Caricamento...' : 'Carica Ordini'}
                </button>

                {orders.length > 0 && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Numero ordine (es. 1001)"
                      value={orderQuery}
                      onChange={(e) => setOrderQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                    <button
                      onClick={handleSearchOrder}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition-all text-sm"
                    >
                      Cerca
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Simulate (form editabile) */}
          {step === 'simulate' && (
            <motion.div
              key="simulate"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Dati Spedizione</h3>
                  <p className="text-xs text-slate-600">Ordine {selectedOrder?.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Nome"
                    value={form.nome}
                    onChange={(e) => setForm({...form, nome: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({...form, telefono: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                
                <input
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
                
                <input
                  placeholder="Indirizzo"
                  value={form.indirizzo}
                  onChange={(e) => setForm({...form, indirizzo: removeAccents(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
                
                <div className="grid grid-cols-4 gap-2">
                  <input
                    placeholder="CAP"
                    value={form.capDestinatario}
                    onChange={(e) => setForm({...form, capDestinatario: e.target.value})}
                    className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Città"
                    value={form.cittaDestinatario}
                    onChange={(e) => setForm({...form, cittaDestinatario: e.target.value})}
                    className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Prov"
                    value={form.provinciaDestinatario}
                    onChange={(e) => setForm({...form, provinciaDestinatario: e.target.value})}
                    className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setStep('import')}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 rounded-xl text-sm"
                  >
                    Indietro
                  </button>
                  <button
                    onClick={handleSimulate}
                    disabled={loading}
                    className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-2 rounded-xl text-sm"
                  >
                    {loading ? 'Simula...' : 'Simula'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Carriers */}
          {step === 'carriers' && (
            <motion.div
              key="carriers"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Scegli Corriere</h3>
                  <p className="text-xs text-slate-600">{carriers.length} opzioni</p>
                </div>
              </div>

              <div className="space-y-2">
                {carriers.slice(0, 4).map((carrier) => (
                  <button
                    key={carrier.id}
                    onClick={() => handleCreateAndPay(carrier.id)}
                    disabled={loading}
                    className="w-full bg-slate-50 hover:bg-slate-100 p-3 rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="font-semibold text-sm">{carrier.corriere}</span>
                    <span className="text-lg font-bold text-slate-900">{parseFloat(carrier.tariffa).toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-2xl flex items-center justify-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-5xl mb-3"
                >
                  ✅
                </motion.div>
                <h3 className="text-2xl font-bold mb-1">Creata!</h3>
                <p className="text-sm text-green-100">Ritorno al menu...</p>
              </div>
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>
    </div>
  );
}
