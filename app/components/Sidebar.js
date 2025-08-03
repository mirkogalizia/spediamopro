import { Truck, BarChart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", icon: <Truck size={32} />, label: "Spedizioni" },
  { href: "/products/sales", icon: <BarChart size={32} />, label: "Stock" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex flex-col items-center py-10 bg-white border-r shadow-sm min-h-screen w-24">
      {nav.map((item) => (
        <Link
          href={item.href}
          key={item.href}
          className={`flex flex-col items-center mb-8 ${pathname === item.href ? "text-blue-600" : "text-gray-400"} group`}
        >
          {item.icon}
          <span className="text-xs mt-1 font-medium">{item.label}</span>
        </Link>
      ))}
    </aside>
  );
}