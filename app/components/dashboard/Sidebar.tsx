// components/dashboard/Sidebar.tsx
'use client';

import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Cloud, 
  Bell, 
  FileText, 
  HelpCircle,
  Settings,
  User
} from 'lucide-react';
import Image from 'next/image';

export function Sidebar() {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Package, label: 'Ordini', active: false },
    { icon: Truck, label: 'Spedizioni', active: false },
    { icon: Cloud, label: 'Magazzino', active: false },
    { icon: Bell, label: 'Alerts', active: false, badge: 3 },
    { icon: FileText, label: 'Reports', active: false },
    { icon: HelpCircle, label: 'Help', active: false },
  ];

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-full w-64 bg-[#F5F3EE]/95 backdrop-blur-xl shadow-2xl z-50 hidden lg:flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Spediamo Pro</h2>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
              ${item.active 
                ? 'bg-slate-700 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-200/50'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-lime-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Bottom User Section */}
      <div className="p-4 border-t border-slate-200/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200/50 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-900">Alex Jackson</p>
            <p className="text-xs text-slate-500">Amministratore</p>
          </div>
        </button>
        
        <button className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200/50 transition-all">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </motion.div>
  );
}
