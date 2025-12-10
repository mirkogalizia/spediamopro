// app/components/dashboard/KPICardWithTrend.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIData {
  value: number;
  trend?: {
    change: number;
    direction: 'up' | 'down';
    average: number;
  };
}

interface Props {
  title: string;
  icon: LucideIcon;
  color: 'green' | 'purple' | 'blue' | 'red' | 'orange';
  apiEndpoint: string;
  valueKey: string;
  suffix?: string;
  refreshInterval?: number;
  showTrend?: boolean;
}

const colorClasses = {
  green: {
    bg: 'bg-green-500/80',
    text: 'text-green-600',
    trend: 'text-green-600'
  },
  purple: {
    bg: 'bg-purple-500/80',
    text: 'text-purple-600',
    trend: 'text-purple-600'
  },
  blue: {
    bg: 'bg-blue-500/80',
    text: 'text-blue-600',
    trend: 'text-blue-600'
  },
  red: {
    bg: 'bg-red-500/80',
    text: 'text-red-600',
    trend: 'text-red-600'
  },
  orange: {
    bg: 'bg-orange-500/80',
    text: 'text-orange-600',
    trend: 'text-orange-600'
  }
};

export function KPICardWithTrend({
  title,
  icon: Icon,
  color,
  apiEndpoint,
  valueKey,
  suffix = '',
  refreshInterval = 60000,
  showTrend = false
}: Props) {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch(apiEndpoint, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData({
          value: json[valueKey] ?? 0,
          trend: json.trend
        });
      }
    } catch (err) {
      console.error('Error fetching KPI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [apiEndpoint, valueKey, refreshInterval]);

  const colors = colorClasses[color];
  const trend = data?.trend;
  const trendAbs = Math.abs(trend?.change || 0);

  // Determina il messaggio del trend
  const getTrendMessage = () => {
    if (!trend) return null;
    
    if (trendAbs < 5) return 'stabile';
    if (trendAbs < 15) return trend.direction === 'up' ? 'leggera crescita' : 'leggero calo';
    if (trendAbs < 30) return trend.direction === 'up' ? 'in crescita' : 'in calo';
    return trend.direction === 'up' ? 'forte crescita' : 'forte calo';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trendAbs < 5) return <Minus className="w-4 h-4" strokeWidth={2.5} />;
    return trend.direction === 'up' 
      ? <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
      : <TrendingDown className="w-4 h-4" strokeWidth={2.5} />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-slate-500';
    if (trendAbs < 5) return 'text-slate-500';
    return trend.direction === 'up' ? 'text-green-600' : 'text-orange-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/40 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/30 relative"
    >
      {/* Icon */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 ${colors.bg} backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 truncate">{title}</h3>
          {loading && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-500">Aggiornamento...</span>
            </div>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className={`text-4xl font-black ${colors.text}`}>
          {loading ? '...' : data?.value ?? 0}
        </span>
        {suffix && <span className="text-lg text-slate-600 ml-1">{suffix}</span>}
      </div>

      {/* Trend Indicator */}
      {showTrend && trend && !loading && (
        <div className="flex items-center gap-2 pt-3 border-t border-white/20">
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-bold">
              {trend.change > 0 ? '+' : ''}{trend.change.toFixed(0)}%
            </span>
          </div>
          <span className="text-xs text-slate-600">
            · {getTrendMessage()}
          </span>
        </div>
      )}

      {/* Hover Info */}
      {showTrend && trend && !loading && (
        <div className="absolute -top-1 -right-1 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
            Media 6gg: {trend.average.toFixed(1)}
          </div>
        </div>
      )}
    </motion.div>
  );
}
