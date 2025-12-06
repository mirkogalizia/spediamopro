// components/dashboard/OrdersCard.tsx
'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export function OrdersCard() {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-black/10 border border-white/50 h-full">
      <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">
        Ordini in Arrivo
      </h3>
      
      {/* Circular Progress come Battery Status */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            ircle
              cx="64"
              cy="64"
              r="56"
              stroke="#E2E8F0"
              strokeWidth="12"
              fill="none"
            />
            ircle
              cx="64"
              cy="64"
              r="56"
              stroke="#10B981"
              strokeWidth="12"
              fill="none"
              strokeDasharray="351.68"
              strokeDashoffset="87.92"
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-slate-900">75%</span>
          </div>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">Totali</p>
          <p className="text-2xl font-bold text-slate-900">12.5</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">Urgenti</p>
          <p className="text-2xl font-bold text-slate-900">4.2</p>
        </div>
      </div>
    </div>
  );
}
