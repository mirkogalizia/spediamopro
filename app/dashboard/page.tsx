// app/dashboard/page.tsx
'use client';

import { motion } from 'framer-motion';
import { Package, Euro, CheckCircle, TrendingUp, AlertTriangle, Truck } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { KPICardWithRefresh } from '@/components/dashboard/KPICardWithRefresh';
import { ShipmentCompactCard } from '@/components/dashboard/ShipmentCompactCard';
import { StatsCard } from '@/components/dashboard/StatsCard';

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen w-full">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070')",
            filter: 'brightness(0.4) contrast(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-pink-900/40" />
      </div>

      <Sidebar />

      {/* Main Content */}
      <div className="relative z-10 ml-0 lg:ml-64 min-h-screen p-6 lg:p-10">
        
        {/* Header compatto */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-white/90 backdrop-blur-md rounded-full px-6 py-3 shadow-xl inline-block">
            <h1 className="text-2xl font-bold text-slate-800">
              Dashboard Spediamo Pro
            </h1>
          </div>
        </motion.div>

        {/* Layout Grid Compatto */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          
          {/* Colonna Sinistra - KPI */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-3 space-y-4"
          >
            <StatsCard
              icon="📦"
              label="Ordini oggi"
              value="125"
              unit="pz"
              color="lime"
            />
            <StatsCard
              icon="✅"
              label="Evasi"
              value="98"
              unit="pz"
              color="mint"
            />
            <StatsCard
              icon="💶"
              label="Incasso"
              value="2,450"
              unit="€"
              color="white"
            />
          </motion.div>

          {/* Centro - Widget Spedizione */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-5"
          >
            <ShipmentCompactCard />
          </motion.div>

          {/* Colonna Destra - KPI Auto-refresh */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 lg:col-span-4 space-y-4"
          >
            <KPICardWithRefresh
              title="Ordini Evasi Oggi"
              icon={CheckCircle}
              color="green"
              apiEndpoint="/api/kpi/store2"
              valueKey="ordersFulfilledToday"
            />
            <KPICardWithRefresh
              title="Incasso Oggi"
              icon={Euro}
              color="purple"
              apiEndpoint="/api/kpi/store2"
              valueKey="revenueToday"
              suffix=" €"
            />
          </motion.div>

          {/* Row inferiore - Altri widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-12 lg:col-span-6"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 h-[280px]">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Corrieri</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">GLS</span>
                    <span className="font-bold">48/100</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full">
                    <div className="h-full bg-slate-800 rounded-full" style={{width: '48%'}} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">SDA</span>
                    <span className="font-bold">40/100</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full">
                    <div className="h-full bg-slate-800 rounded-full" style={{width: '40%'}} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Bartolini</span>
                    <span className="font-bold">55/100</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full">
                    <div className="h-full bg-slate-800 rounded-full" style={{width: '55%'}} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="col-span-12 lg:col-span-6"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 h-[280px]">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Widget Placeholder</h3>
              <p className="text-slate-600 text-sm">Spazio per altro widget</p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

