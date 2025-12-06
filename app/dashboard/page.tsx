// app/dashboard/page.tsx
'use client';

import { motion } from 'framer-motion';
import { Package, TrendingUp, Euro, CheckCircle } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { KPICardWithRefresh } from '@/components/dashboard/KPICardWithRefresh';
import { ShipmentFlipCard } from '@/components/dashboard/ShipmentFlipCard';

export default function DashboardPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
      </div>

      <Sidebar />

      <div className="relative z-10 ml-0 lg:ml-64 h-full overflow-y-auto">
        <div className="p-6 lg:p-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Dashboard Spediamo Pro
            </h1>
            <p className="text-slate-600">Store 2 - Monitoraggio in tempo reale</p>
          </motion.div>

          {/* KPI Grid con Auto-Refresh */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
          </div>

          {/* Widget Spedizione con Flip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ShipmentFlipCard />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

