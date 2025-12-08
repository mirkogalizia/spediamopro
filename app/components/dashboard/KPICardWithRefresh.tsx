// app/components/dashboard/KPICardWithRefresh.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'purple';
  apiEndpoint: string;
  valueKey: string;
  suffix?: string;
  refreshInterval?: number;
}

const colorClasses = {
  blue: 'from-blue-500/80 to-blue-600/80',
  green: 'from-green-500/80 to-green-600/80',
  red: 'from-red-500/80 to-red-600/80',
  purple: 'from-purple-500/80 to-purple-600/80'
};

export function KPICardWithRefresh({ 
  title, 
  icon: Icon, 
  color, 
  apiEndpoint, 
  valueKey,
  suffix = '',
  refreshInterval = 60000
}: KPICardProps) {
  const [value, setValue] = useState<string>('...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(apiEndpoint, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setValue(data[valueKey]?.toString() || '0');
      }
    } catch (error) {
      console.error('Errore fetch KPI:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [apiEndpoint, valueKey, refreshInterval]);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/30 relative overflow-hidden"
    >
      {/* Indicatore refresh */}
      {isRefreshing && (
        <motion.div 
          className="absolute top-3 right-3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" />
        </motion.div>
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-700 font-semibold mb-1">
            {title}
          </p>
          <h3 className="text-4xl font-bold text-slate-900 mb-2">
            {value}{suffix}
          </h3>
          <p className="text-xs text-slate-600">
            Aggiornamento ogni {refreshInterval / 1000}s
          </p>
        </div>
        
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{ duration: 0.6 }}
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl shadow-lg border border-white/30`}
        >
          <Icon className="w-6 h-6 text-white" strokeWidth={2} />
        </motion.div>
      </div>
    </motion.div>
  );
}
