// components/dashboard/ShipmentQuickCard.tsx
'use client';

import { motion } from 'framer-motion';
import { Package, Zap, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export function ShipmentQuickCard() {
  const [orderId, setOrderId] = useState('');

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/10 border border-white/50">
      {/* Header con Badge giallo "optimal zone" style */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Crea Spedizione</h2>
            <p className="text-sm text-slate-600">Importa e gestisci ordini</p>
          </div>
        </div>
        <div className="bg-lime-400 px-4 py-2 rounded-full shadow-lg">
          <span className="text-sm font-bold text-slate-900">Zona Ottimale</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Stat Box 1 */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-600 uppercase">Processati</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-slate-900">64</span>
            <span className="text-lg font-semibold text-slate-600">%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">For cultivation</p>
        </div>

        {/* Product Boxes come in Harvesta */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border border-orange-100 flex flex-col items-center justify-center">
            <span className="text-3xl mb-1">📦</span>
            <p className="text-xs font-semibold text-slate-700">Corn</p>
            <p className="text-xs text-slate-500">375 t</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 flex flex-col items-center justify-center">
            <span className="text-3xl mb-1">🥔</span>
            <p className="text-xs font-semibold text-slate-700">Potato</p>
            <p className="text-xs text-slate-500">730 t</p>
          </div>
          <div className="col-span-2 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-3 border border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥕</span>
              <div>
                <p className="text-xs font-semibold text-slate-700">Carrot</p>
                <p className="text-xs text-slate-500">1000 t</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Field */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Order ID / Numero ordine Shopify"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none font-medium transition-colors"
        />
      </div>

      {/* Action Button come "Add Crop" */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-lime-400/30 transition-colors flex items-center justify-center gap-2"
      >
        <Package className="w-5 h-5" />
        Importa Ordine
      </motion.button>
    </div>
  );
}
