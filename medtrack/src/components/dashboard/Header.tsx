"use client";

import { Bell, Search, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-4 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-zinc-900/80 dark:border-zinc-800">
      <div className="flex items-center lg:hidden">
        <button className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-zinc-700">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center flex-1 ml-4 lg:ml-0">
        <div className="relative w-full max-w-md hidden md:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-200 rounded-full bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-colors"
            placeholder="Search medicines, patients, or orders..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full dark:border-zinc-900"></span>
        </button>
        
        <div className="flex items-center gap-3 ml-2">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">Admin User</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pharmacist</p>
          </div>
          <img
            className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm"
            src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
            alt="User avatar"
          />
        </div>
      </div>
    </header>
  );
}
