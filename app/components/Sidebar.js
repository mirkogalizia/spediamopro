import {
  Truck,
  Boxes,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", icon: <Truck size={28} strokeWidth={2.5} />, tooltip: "Spedizioni" },
  { href: "/products/sales", icon: <Boxes size={26} strokeWidth={2.5} />, tooltip: "Stock & Previsionale" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex flex-col items-center py-10 bg-white border-r border-gray-100 shadow-lg min-h-screen w-20 z-10">
      {nav.map((item) => (
        <Link
          href={item.href}
          key={item.href}
          className={`group mb-8 rounded-2xl p-2 hover:bg-blue-50 transition
            ${pathname === item.href ? "bg-blue-100 text-blue-600 shadow-sm" : "text-gray-400"}
          `}
        >
          <div className="flex flex-col items-center relative">
            {item.icon}
            {/* Tooltip all’hover */}
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#222] text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 pointer-events-none shadow-lg transition z-50 whitespace-nowrap">
              {item.tooltip}
            </span>
          </div>
        </Link>
      ))}
    </aside>
  );
}