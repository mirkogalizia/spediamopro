// app/dashboard/page.tsx
'use client';

import { motion } from 'framer-motion';
import { Package, Euro, CheckCircle, AlertTriangle } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { KPICardWithTrend } from '@/components/dashboard/KPICardWithTrend';
import { ShipmentCompactCard } from '@/components/dashboard/ShipmentCompactCard';

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen w-full">
      {/* Background */}
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

      <div className="relative z-10 ml-0 lg:ml-64 min-h-screen p-6 lg:p-10">
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-white/60 backdrop-blur-2xl rounded-full px-6 py-3 shadow-xl inline-block border border-white/40">
            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard Spediamo Pro
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          
          {/* Colonna Sinistra - KPI */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-3 space-y-4"
          >
            <KPICardWithTrend
              title="Evasi Oggi"
              icon={CheckCircle}
              color="green"
              apiEndpoint="/api/kpi/store2"
              valueKey="ordersFulfilledToday"
              refreshInterval={60000}
              showTrend={true}
            />
            
            <KPICardWithTrend
              title="Incasso Oggi"
              icon={Euro}
              color="purple"
              apiEndpoint="/api/kpi/store2"
              valueKey="revenueToday"
              suffix=" €"
              refreshInterval={60000}
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

          {/* Destra - Ordini inevasi */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 lg:col-span-4"
          >
            <KPICardWithTrend
              title="Totale Ordini Inevasi"
              icon={AlertTriangle}
              color="red"
              apiEndpoint="/api/kpi/store2"
              valueKey="ordersUnfulfilled"
              refreshInterval={120000}
            />
          </motion.div>

        </div>
      </div>
    </div>
  );
}

