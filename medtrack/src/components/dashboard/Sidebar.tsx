"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/dashboard/inventory", icon: Pill },
  { name: "Sales", href: "/dashboard/sales", icon: ShoppingCart },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex flex-col h-full px-3 py-4">
        <div className="flex items-center mb-8 px-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <span className="self-center text-xl font-bold whitespace-nowrap text-gray-900 dark:text-white tracking-tight">
            MedTrack
          </span>
        </div>

        <ul className="space-y-1.5 font-medium flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center p-3 rounded-lg group transition-all duration-200 ease-in-out",
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                    )}
                  />
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-zinc-800">
          <button className="flex items-center w-full p-3 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white group transition-all duration-200">
            <LogOut className="w-5 h-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-colors" />
            <span className="ml-3 font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
