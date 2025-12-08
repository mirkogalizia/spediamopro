// app/components/dashboard/ShipmentCompactCard.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, ArrowRight, Edit2, CheckCircle, Printer, RefreshCw } from 'lucide-react';

type Step = 'import' | 'simulate' | 'carriers' | 'actions' | 'success';

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getTrackingLabel(spedizione) {
  if (Array.isArray(spedizione.colli) && spedizione.colli.length > 0 && spedizione.colli[0].segnacollo) {
    return spedizione.colli[0].segnacollo;
  }
  if (spedizione.tracking_number_corriere) return spedizione.tracking_number_corriere;
  if (spedizione.tracking_number) return spedizione.tracking_number;
  if (spedizione.segnacollo) return spedizione.segnacollo;
  if (spedizione.codice) return spedizione.codice;
  return "";
}

export function ShipmentCompactCard() {
  const [step, setStep] = useState<Step>('import');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false); // ← Nuovo flag
  const [orderQuery, setOrderQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [createdShipment, setCreatedShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    setError(null);
    try {
      const res = await fetch(`/api/shopify2?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setOrdersLoaded(true); // ← Segna come caricati
      } else {
        setError('Errore caricamento ordini');
      }
    } catch (err) {
      setError('Errore connessione');
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
      setError(null);
    } else {
      setError('Ordine non trovato');
    }
  };

  // Simula
  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
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
      } else {
        setError('Errore simulazione');
      }
    } catch (err) {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };

  // Crea e paga
  const handleCreateAndPay = async (carrierId) => {
    setLoading(true);
    setError(null);
    try {
      const resC = await fetch(`/api/spediamo2?step=create&id=${carrierId}&shopifyOrderId=${selectedOrder.id}`, {
        method: 'POST'// Crea e paga
const handleCreateAndPay = async (carrierId: number) => {
  setLoading(true);
  setError(null);
  try {
    const resC = await fetch(`/api/spediamo2?step=create&id=${carrierId}&shopifyOrderId=${selectedOrder.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consigneePickupPointId: null })
    });
    
    if (!resC.ok) throw new Error('Errore creazione spedizione');
    const createData: any = await resC.json();
    const spedizione = createData.spedizione;
    
    const resU = await fetch(`/api/spediamo?step=update&id=${spedizione.id}`, {
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
        noteDestinatario: '',
        consigneePickupPointId: null,
      })
    });
    
    if (!resU.ok) throw new Error('Errore aggiornamento indirizzo');
    const dataUpd: any = await resU.json();
    
    const resP = await fetch(`/api/spediamo?step=pay&id=${spedizione.id}`, { method: 'POST' });
    let dataP: any = {};
    try { 
      dataP = await resP.json(); 
    } catch (e) { 
      dataP = {}; 
    }
    
    const resDetails = await fetch(`/api/spediamo?step=details&id=${spedizione.id}`, { method: 'POST' });
    let detailsData: any = { spedizione: {} };
    if (resDetails.ok) { 
      try {
        detailsData = await resDetails.json(); 
      } catch (e) {
        detailsData = { spedizione: {} };
      }
    }
    
    const finalShipment = { 
      ...dataUpd.spedizione, 
      ...detailsData.spedizione,
      shopifyOrder: selectedOrder,
      canPay: dataP.can_pay,
      payReason: dataP.message || dataP.error || ''
    };
    
    setCreatedShipment(finalShipment);
    setStep('actions');
    
  } catch (err: any) {
    setError(err.message || 'Errore creazione');
  } finally {
    setLoading(false);
  }
};

  // Fulfill order
  const handleFulfillOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const tracking = getTrackingLabel(createdShipment);
      const res = await fetch('/api/shopify2/fulfill-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          trackingNumber: tracking,
          carrierName: createdShipment.corriere || 'Altro',
        }),
      });

      const data = await res.json();
      
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Errore evasione');
      }

      alert('✅ Ordine evaso con successo!');
      
    } catch (err) {
      setError(err.message);
      alert(`❌ Errore evasione: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Stampa etichetta
  const handlePrintLabel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spediamo?step=ldv&id=${createdShipment.id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore download etichetta');
      
      const { ldv } = await res.json();
      const byteChars = atob(ldv.b64);
      const bytes = Uint8Array.from(byteChars, (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: ldv.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ldv_${createdShipment.id}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setTimeout(() => {
        setStep('success');
        setTimeout(() => {
          resetToSearch(); // ← Reset ma mantiene ordini
        }, 2000);
      }, 500);
      
    } catch (err) {
      setError(err.message);
      alert(`❌ Errore stampa: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset parziale (mantiene ordini caricati)
  const resetToSearch = () => {
    setStep('import');
    setSelectedOrder(null);
    setOrderQuery('');
    setCarriers([]);
    setCreatedShipment(null);
    setError(null);
    // NON resettiamo orders e ordersLoaded!
  };

  // Reset completo (ricarica tutto)
  const resetComplete = () => {
    setStep('import');
    setSelectedOrder(null);
    setOrderQuery('');
    setCarriers([]);
    setCreatedShipment(null);
    setError(null);
    setOrders([]);
    setOrdersLoaded(false);
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {ordersLoaded ? 'Cerca Ordine' : 'Importa Ordini'}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {ordersLoaded ? `${orders.length} ordini caricati` : 'Seleziona periodo'}
                    </p>
                  </div>
                </div>
                
                {/* Pulsante ricarica */}
                {ordersLoaded && (
                  <button
                    onClick={resetComplete}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="Ricarica ordini"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>

              {error && <div className="mb-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

              <div className="space-y-3">
                {/* Mostra date e carica SOLO se ordini non ancora caricati */}
                {!ordersLoaded && (
                  <>
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
                  </>
                )}

                {/* Mostra ricerca se ordini già caricati */}
                {ordersLoaded && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Numero ordine (es. 1001)"
                      value={orderQuery}
                      onChange={(e) => setOrderQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSearchOrder}
                      disabled={!orderQuery.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cerca e Importa
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Simulate (uguale a prima) */}
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
                    onClick={resetToSearch}
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

          {/* STEP 3, 4, 5: Carriers, Actions, Success (come prima) */}
          {/* ... resto del codice uguale ... */}
          
        </AnimatePresence>
      </div>
    </div>
  );
}

