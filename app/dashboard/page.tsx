// app/dashboard/page.tsx
'use client';

import { motion } from 'framer-motion';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ShipmentQuickCard } from '@/components/dashboard/ShipmentQuickCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { OrdersCard } from '@/components/dashboard/OrdersCard';

export default function DashboardPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/warehouse-bg.jpg')",
            filter: 'brightness(0.85) contrast(1.1)'
          }}
        />
        {/* Gradient Overlay per migliorare leggibilità */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-transparent to-purple-900/20" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area con Cards sovrapposte */}
      <div className="relative z-10 ml-0 lg:ml-64 h-full overflow-y-auto">
        <div className="p-6 lg:p-10">
          {/* Header Area */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg">
                <h1 className="text-2xl font-bold text-slate-800">
                  Dashboard Principale
                </h1>
              </div>
              
              {/* Top Right Pills come in Harvesta */}
              <div className="flex gap-3">
                <div className="bg-white/90 backdrop-blur-md rounded-full px-5 py-2.5 shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-700">Oggi: 12 ordini</span>
                </div>
                <div className="bg-white/90 backdrop-blur-md rounded-full px-5 py-2.5 shadow-lg">
                  <span className="text-sm font-semibold text-slate-700">19% efficienza</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Grid Layout Asimmetrico come Harvesta */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Stats Pills */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="col-span-12 lg:col-span-3 space-y-4"
            >
              <StatsCard
                icon="📦"
                label="Area spedizioni"
                value="125"
                unit="ordini"
                color="lime"
              />
              <StatsCard
                icon="⚡"
                label="Velocità media"
                value="0.62"
                unit="h/ordine"
                color="mint"
              />
              <StatsCard
                icon="💧"
                label="Umidità magazzino"
                value="19%"
                unit=""
                color="white"
              />
            </motion.div>

            {/* Center - Main Shipment Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-12 lg:col-span-6"
            >
              <ShipmentQuickCard />
            </motion.div>

            {/* Right - Secondary Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-12 lg:col-span-3"
            >
              <OrdersCard />
            </motion.div>
          </div>

          {/* Bottom Section - Analytics Card come NPK Levels */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-black/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Performance corrieri</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-lime-400 text-slate-900 rounded-full text-sm font-bold shadow-lg hover:bg-lime-500 transition-colors">
                    Analysis
                  </button>
                  <button className="px-4 py-2 bg-slate-200 text-slate-600 rounded-full text-sm font-semibold hover:bg-slate-300 transition-colors">
                    Record
                  </button>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">GLS</span>
                    <span className="font-bold text-slate-900">48/100</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: '48%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">SDA</span>
                    <span className="font-bold text-slate-900">40/100</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">Bartolini</span>
                    <span className="font-bold text-slate-900">55/100</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
