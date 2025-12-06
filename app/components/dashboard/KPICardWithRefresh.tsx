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
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600'
};

export function KPICardWithRefresh({ 
  title, 
  icon: Icon, 
  color, 
  apiEndpoint, 
  valueKey,
  suffix = ''
}: KPICardProps) {
  const [value, setValue] = useState<string>('...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(apiEndpoint);
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
    fetchData(); // Fetch iniziale
    const interval = setInterval(fetchData, 60000); // Ogni 60 secondi
    return () => clearInterval(interval);
  }, [apiEndpoint, valueKey]);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-black/10 border border-white/50 relative overflow-hidden"
    >
      {/* Indicatore refresh */}
      {isRefreshing && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600 font-medium mb-1">
            {title}
          </p>
          <h3 className="text-4xl font-bold text-slate-900 mb-2">
            {value}{suffix}
          </h3>
        </div>
        
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{ duration: 0.6 }}
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    </motion.div>
  );
}
