// app/components/dashboard/StatsCard.tsx (già ce l'hai, ma assicurati sia compatta)
'use client';

import { motion } from 'framer-motion';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: 'lime' | 'mint' | 'white';
}

const colorClasses = {
  lime: 'bg-gradient-to-br from-lime-100 to-lime-200 shadow-lime-200/50',
  mint: 'bg-gradient-to-br from-emerald-50 to-teal-100 shadow-teal-200/50',
  white: 'bg-white/90 shadow-slate-300/50'
};

export function StatsCard({ icon, label, value, unit, color }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -3 }}
      className={`
        ${colorClasses[color]}
        backdrop-blur-xl rounded-3xl p-5 shadow-xl
        border border-white/50 h-[120px] flex flex-col justify-between
      `}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center text-xl shadow-lg">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          {unit && <span className="text-sm font-medium text-slate-600">{unit}</span>}
        </div>
      </div>
    </motion.div>
  );
}
