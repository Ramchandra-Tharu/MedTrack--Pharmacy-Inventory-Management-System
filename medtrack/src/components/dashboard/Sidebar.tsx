"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Pill,
  Package,
  ShoppingCart,
  CalendarDays,
  FileText,
  BarChart3,
  Camera,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Medicines", href: "/admin/medicines", icon: Pill },
  { name: "Inventory", href: "/admin/inventory", icon: Package },
  { name: "Sales / POS", href: "/admin/sales", icon: ShoppingCart },
  { name: "Expiry Management", href: "/admin/expiry", icon: CalendarDays },
  { name: "Invoices", href: "/admin/invoices", icon: FileText },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "OCR Entry", href: "/admin/ocr", icon: Camera },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0" style={{ backgroundColor: '#0B2136' }}>
      <div className="flex flex-col h-full">
        <div className="flex items-center px-6 py-6 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00A1BA] flex items-center justify-center mr-3">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold whitespace-nowrap text-white tracking-tight">
              MedTrack
            </span>
            <span className="text-[10px] text-gray-400">
              Smarter Pharmacy Management
            </span>
          </div>
        </div>

        <ul className="space-y-1 px-4 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg group transition-colors",
                    isActive
                      ? "bg-[#188FA7] text-white"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  <span className="ml-3 font-medium text-sm">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="p-4 mt-4">
          <div className="bg-[#112E46] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00A1BA]/20 flex items-center justify-center">
              <Pill className="w-5 h-5 text-[#00A1BA]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">MedTrack</span>
              <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                B2B Pharmacy Inventory &<br/>FEFO Management System
              </span>
            </div>
          </div>
          <div className="mt-4 px-2">
            <span className="text-xs text-gray-500">v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
