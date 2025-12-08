// app/components/dashboard/ShipmentCompactCard.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, Edit2, CheckCircle, Printer, RefreshCw, Search, Calendar, ArrowLeft } from 'lucide-react';

type Step = 'import' | 'simulate' | 'carriers' | 'actions' | 'success';

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getTrackingLabel(spedizione: any) {
  if (Array.isArray(spedizione.colli) && spedizione.colli.length > 0 && spedizione.colli[0].segnacollo) {
    return spedizione.colli[0].segnacollo;
  }
  if (spedizione.tracking_number_corriere) return spedizione.tracking_number_corriere;
  if (spedizione.tracking_number) return spedizione.tracking_number;
  if (spedizione.segnacollo) return spedizione.segnacollo;
  if (spedizione.codice) return spedizione.codice;
  return "";
}

// Funzione per ottenere l'icona del corriere
function getCarrierIcon(corriereName: string) {
  const name = corriereName.toLowerCase();
  
  // Mappa icone corrieri (usa emoji o lucide-react icons)
  if (name.includes('poste') || name.includes('sda')) return '📮';
  if (name.includes('bartolini') || name.includes('brt')) return '🚚';
  if (name.includes('gls')) return '📦';
  if (name.includes('dhl')) return '✈️';
  if (name.includes('ups')) return '📦';
  if (name.includes('fedex')) return '🚀';
  if (name.includes('tnt')) return '🚛';
  
  return '🚚'; // Default
}

export function ShipmentCompactCard() {
  const [step, setStep] = useState<Step>('import');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [createdShipment, setCreatedShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleLoadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shopify2?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setOrdersLoaded(true);
      } else {
        setError('Errore caricamento ordini');
      }
    } catch (err) {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };

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
      try { dataP = await resP.json(); } catch (e) { dataP = {}; }
      
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

  // ✅ FULFILL ORDER - Funziona correttamente
  const handleFulfillOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const tracking = getTrackingLabel(createdShipment);
      
      console.log('[FULFILL] Inizio evasione ordine:', {
        orderId: selectedOrder.id,
        tracking: tracking,
        carrier: createdShipment.corriere
      });
      
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
      
      console.log('[FULFILL] Risposta API:', data);
      
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Errore evasione ordine');
      }

      alert('✅ Ordine evaso con successo su Shopify!');
      
    } catch (err: any) {
      console.error('[FULFILL] Errore:', err);
      setError(err.message);
      alert(`❌ Errore evasione: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ STAMPA ETICHETTA - Funziona correttamente
  const handlePrintLabel = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[PRINT] Download etichetta per ID:', createdShipment.id);
      
      const res = await fetch(`/api/spediamo?step=ldv&id=${createdShipment.id}`, { method: 'POST' });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Errore download etichetta');
      }
      
      const { ldv } = await res.json();
      
      console.log('[PRINT] Etichetta ricevuta, tipo:', ldv.type);
      
      // Decodifica base64 e crea blob
      const byteChars = atob(ldv.b64);
      const bytes = Uint8Array.from(byteChars, (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: ldv.type });
      const url = URL.createObjectURL(blob);
      
      // Download automatico
      const a = document.createElement('a');
      a.href = url;
      a.download = `etichetta_${createdShipment.id}_${selectedOrder.name}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      console.log('[PRINT] Download completato');

      // Success e reset dopo 2 secondi
      setTimeout(() => {
        setStep('success');
        setTimeout(() => {
          resetToSearch();
        }, 2000);
      }, 500);
      
    } catch (err: any) {
      console.error('[PRINT] Errore:', err);
      setError(err.message);
      alert(`❌ Errore stampa etichetta: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetToSearch = () => {
    setStep('import');
    setSelectedOrder(null);
    setOrderQuery('');
    setCarriers([]);
    setCreatedShipment(null);
    setError(null);
  };

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

  // Funzione per tornare indietro
  const goBack = () => {
    if (step === 'simulate') {
      resetToSearch();
    } else if (step === 'carriers') {
      setStep('simulate');
    } else if (step === 'actions') {
      setStep('carriers');
    }
    setError(null);
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
              className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/30"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/60 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
                    {ordersLoaded ? (
                      <Search className="w-6 h-6 text-slate-700" strokeWidth={2} />
                    ) : (
                      <Calendar className="w-6 h-6 text-slate-700" strokeWidth={2} />
                    )}
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
                
                {ordersLoaded && (
                  <button
                    onClick={resetComplete}
                    className="p-2.5 rounded-xl bg-white/50 hover:bg-white/70 transition-all backdrop-blur-xl border border-white/40 shadow-sm"
                    title="Ricarica ordini"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" strokeWidth={2} />
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-3 text-xs text-red-700 bg-red-50/80 backdrop-blur-sm p-2.5 rounded-xl border border-red-200/50">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {!ordersLoaded && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Da</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm text-slate-900 shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">A</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm text-slate-900 shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleLoadOrders}
                      disabled={loading}
                      className="w-full bg-slate-800/90 hover:bg-slate-900 backdrop-blur-xl text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg border border-slate-700/50 disabled:opacity-50"
                    >
                      {loading ? 'Caricamento...' : 'Carica Ordini'}
                    </button>
                  </>
                )}

                {ordersLoaded && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Numero ordine (es. 1001)"
                      value={orderQuery}
                      onChange={(e) => setOrderQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm text-slate-900 placeholder:text-slate-500 shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                      autoFocus
                    />
                    <button
                      onClick={handleSearchOrder}
                      disabled={!orderQuery.trim()}
                      className="w-full bg-slate-800/90 hover:bg-slate-900 backdrop-blur-xl text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg border border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Search className="w-4 h-4" strokeWidth={2} />
                      Cerca e Importa
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Simulate */}
          {step === 'simulate' && (
            <motion.div
              key="simulate"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/30 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/60 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
                    <Edit2 className="w-6 h-6 text-slate-700" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Dati Spedizione</h3>
                    <p className="text-xs text-slate-600">Ordine {selectedOrder?.name}</p>
                  </div>
                </div>
                
                {/* Tasto indietro */}
                <button
                  onClick={goBack}
                  className="p-2.5 rounded-xl bg-white/50 hover:bg-white/70 transition-all backdrop-blur-xl border border-white/40 shadow-sm"
                  title="Torna indietro"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Nome"
                    value={form.nome}
                    onChange={(e) => setForm({...form, nome: e.target.value})}
                    className="px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                  />
                  <input
                    placeholder="Telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({...form, telefono: e.target.value})}
                    className="px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                  />
                </div>
                
                <input
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                />
                
                <input
                  placeholder="Indirizzo"
                  value={form.indirizzo}
                  onChange={(e) => setForm({...form, indirizzo: removeAccents(e.target.value)})}
                  className="w-full px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                />
                
                <div className="grid grid-cols-4 gap-2">
                  <input
                    placeholder="CAP"
                    value={form.capDestinatario}
                    onChange={(e) => setForm({...form, capDestinatario: e.target.value})}
                    className="px-2 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300"
                  />
                  <input
                    placeholder="Città"
                    value={form.cittaDestinatario}
                    onChange={(e) => setForm({...form, cittaDestinatario: e.target.value})}
                    className="col-span-2 px-3 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300"
                  />
                  <input
                    placeholder="Prov"
                    value={form.provinciaDestinatario}
                    onChange={(e) => setForm({...form, provinciaDestinatario: e.target.value})}
                    className="px-2 py-2.5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl text-sm shadow-sm focus:outline-none focus:border-slate-300"
                  />
                </div>

                <button
                  onClick={handleSimulate}
                  disabled={loading}
                  className="w-full bg-slate-800/90 hover:bg-slate-900 backdrop-blur-xl text-white font-bold py-2.5 rounded-xl text-sm shadow-lg border border-slate-700/50 mt-3"
                >
                  {loading ? 'Simula...' : 'Simula Corrieri'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Carriers con Icone */}
          {step === 'carriers' && (
            <motion.div
              key="carriers"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/30 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/60 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
                    <Truck className="w-6 h-6 text-slate-700" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Scegli Corriere</h3>
                    <p className="text-xs text-slate-600">{carriers.length} opzioni</p>
                  </div>
                </div>
                
                {/* Tasto indietro */}
                <button
                  onClick={goBack}
                  className="p-2.5 rounded-xl bg-white/50 hover:bg-white/70 transition-all backdrop-blur-xl border border-white/40 shadow-sm"
                  title="Torna indietro"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-2.5">
                {carriers.slice(0, 5).map((carrier) => (
                  <button
                    key={carrier.id}
                    onClick={() => handleCreateAndPay(carrier.id)}
                    disabled={loading}
                    className="w-full bg-white/60 hover:bg-white/80 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between transition-all border border-white/40 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icona specifica del corriere */}
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
                        {getCarrierIcon(carrier.corriere)}
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-sm text-slate-800 block">{carrier.corriere}</span>
                        <span className="text-xs text-slate-600">{carrier.servizio || 'Standard'}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{parseFloat(carrier.tariffa).toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Actions */}
          {step === 'actions' && createdShipment && (
            <motion.div
              key="actions"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/30"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/60 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
                    <CheckCircle className="w-6 h-6 text-green-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Spedizione Creata</h3>
                    <p className="text-xs text-slate-600">ID {createdShipment.id}</p>
                  </div>
                </div>
                
                {/* Tasto indietro */}
                <button
                  onClick={goBack}
                  className="p-2.5 rounded-xl bg-white/50 hover:bg-white/70 transition-all backdrop-blur-xl border border-white/40 shadow-sm"
                  title="Torna indietro"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
                </button>
              </div>

              <div className="bg-green-50/60 backdrop-blur-xl rounded-2xl p-4 mb-4 border border-green-200/50 shadow-sm">
                <p className="text-sm font-semibold text-green-900 mb-1">
                  ✅ Spedizione pagata e pronta!
                </p>
                <p className="text-xs text-green-700">
                  Tracking: <span className="font-mono font-bold">{getTrackingLabel(createdShipment) || 'In attesa...'}</span>
                </p>
              </div>

              {error && <div className="mb-3 text-xs text-red-700 bg-red-50/80 backdrop-blur-sm p-2.5 rounded-xl border border-red-200/50">{error}</div>}

              <div className="space-y-3">
                {/* ✅ Pulsante Fulfill - FUNZIONANTE */}
                <button
                  onClick={handleFulfillOrder}
                  disabled={loading}
                  className="w-full bg-slate-800/90 hover:bg-slate-900 backdrop-blur-xl text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg border border-slate-700/50 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" strokeWidth={2} />
                  {loading ? 'Evasione in corso...' : 'Evadi Ordine su Shopify'}
                </button>

                {/* ✅ Pulsante Stampa - FUNZIONANTE */}
                <button
                  onClick={handlePrintLabel}
                  disabled={loading}
                  className="w-full bg-white/60 hover:bg-white/80 backdrop-blur-xl text-slate-800 font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 border border-white/40 shadow-sm disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" strokeWidth={2} />
                  {loading ? 'Download...' : 'Stampa Etichetta'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-3xl shadow-xl flex items-center justify-center border border-white/30"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-500/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30"
                >
                  <CheckCircle className="w-10 h-10 text-green-600" strokeWidth={2} />
                </motion.div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">Completato!</h3>
                <p className="text-sm text-slate-600">Ritorno al menu...</p>
              </div>
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>
    </div>
  );
}


