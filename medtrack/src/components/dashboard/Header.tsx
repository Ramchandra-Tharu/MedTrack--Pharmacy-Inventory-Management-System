"use client";

import { Bell, Search, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-20 px-8 bg-white border-b border-gray-100">
      <div className="flex items-center lg:hidden">
        <button className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center flex-1 ml-4 lg:ml-0">
        <div className="relative w-full max-w-xl hidden md:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full py-2.5 pl-12 pr-4 text-sm text-gray-900 border border-gray-200 rounded-xl bg-white focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 shadow-sm"
            placeholder="Search medicines, batches, invoices..."
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
            3
          </span>
        </button>
        
        <div className="flex items-center gap-3">
          <img
            className="w-10 h-10 rounded-full object-cover"
            src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
            alt="User avatar"
          />
          <div className="hidden md:flex md:flex-col text-left">
            <span className="text-sm font-semibold text-gray-900 leading-tight">Admin</span>
            <span className="text-xs text-gray-500 font-medium">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
