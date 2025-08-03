'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, BarChart, Archive } from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Spedizioni',
    href: '/',
    icon: <Truck className="w-5 h-5" />,
  },
  {
    label: 'Previsionale Magazzino',
    href: '/products/sales',
    icon: <BarChart className="w-5 h-5" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#f9fafc] border-r border-[#e5e7eb] shadow-md flex flex-col z-30">
      <div className="h-20 flex items-center justify-center border-b border-[#e5e7eb] mb-3">
        <span className="font-extrabold text-2xl tracking-wide bg-gradient-to-r from-[#2b59ff] to-[#00c9a7] bg-clip-text text-transparent select-none">
          EHI! Lab
        </span>
      </div>
      <nav className="flex-1 flex flex-col gap-2 mt-3 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-lg transition
                ${isActive
                  ? "bg-gradient-to-r from-[#2b59ff]/10 to-[#00c9a7]/10 text-[#2b59ff] shadow"
                  : "text-[#444] hover:bg-[#ececf0]"}
              `}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 text-xs text-[#b8b8be]">
        <span className="opacity-80">© {new Date().getFullYear()} EHI! Lab</span>
      </div>
    </aside>
  );
}