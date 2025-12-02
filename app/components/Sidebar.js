"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Spedizioni", icon: "🚚" },
  { href: "/blanks", label: "Stock", icon: "📦" },
  { href: "/produzione", label: "Produzione", icon: "🏭" },
  { href: "/dtf", label: "DTF", icon: "🎨" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-20 h-full bg-white border-r border-gray-200 shadow-lg flex flex-col items-center py-4">
      <div className="flex flex-col gap-3 w-full px-2">
        {nav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-3xl mb-1">{item.icon}</span>
              <span
                className={`text-xs text-center ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
