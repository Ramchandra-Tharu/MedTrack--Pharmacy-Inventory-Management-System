"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  IndianRupee,
  Pill,
  ChevronDown,
  Receipt,
  TrendingUp,
  CalendarDays,
  Clock,
  Package,
  Layers,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface Medicine {
  _id: string;
  name: string;
  genericName?: string;
  category?: string;
}

interface BatchInfo {
  _id: string;
  batchNumber: string;
  sellingPrice: number;
  quantity: number;
  expirationDate: string;
}

interface CartItem {
  medicine: Medicine;
  batches: BatchInfo[];      // available FEFO batches
  availableStock: number;
  unitPrice: number;         // from earliest-expiring batch
  quantity: number;
}

interface SaleRecord {
  _id: string;
  medicineId: { _id: string; name: string; category?: string } | null;
  batchId: { _id: string; batchNumber: string } | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
}

interface SalesStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  salesCount: number;
}

type ToastType = "success" | "error";
interface Toast { id: number; message: string; type: ToastType; }
type Tab = "pos" | "history";

// ── Helpers ────────────────────────────────────────────────────
function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ── Main page ──────────────────────────────────────────────────
export default function SalesPOSPage() {
  const [tab, setTab] = useState<Tab>("pos");

  // POS state
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batchMap, setBatchMap] = useState<Record<string, BatchInfo[]>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [showMedList, setShowMedList] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<SaleRecord[] | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // History state
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  // ── Load medicines + their batches ────────────────────────────
  useEffect(() => {
    fetch("/api/medicines?status=active")
      .then((r) => r.json())
      .then(async (j) => {
        if (!j.success) return;
        setMedicines(j.data);

        // Load available batches for all medicines
        const res = await fetch("/api/batches?stock=available&expiry=valid");
        const bj = await res.json();
        if (!bj.success) return;

        const map: Record<string, BatchInfo[]> = {};
        for (const b of bj.data) {
          const mid = b.medicineId?._id ?? b.medicineId;
          if (!mid) continue;
          if (!map[mid]) map[mid] = [];
          map[mid].push({
            _id: b._id,
            batchNumber: b.batchNumber,
            sellingPrice: b.sellingPrice,
            quantity: b.quantity,
            expirationDate: b.expirationDate,
          });
        }
        // Sort each medicine's batches by expiry (FEFO)
        for (const mid in map) {
          map[mid].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
        }
        setBatchMap(map);
      });
  }, [processing]); // refetch after a sale

  // ── Load sales history + stats ────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [statsRes, salesRes] = await Promise.all([
        fetch("/api/sales/stats"),
        fetch(`/api/sales?${dateFrom ? `from=${dateFrom}` : ""}${dateTo ? `&to=${dateTo}` : ""}`),
      ]);
      const sj = await statsRes.json();
      const hj = await salesRes.json();
      if (sj.success) setStats(sj.data);
      if (hj.success) setSales(hj.data);
    } catch {
      addToast("Failed to load sales history", "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  // ── Cart operations ───────────────────────────────────────────
  const filteredMeds = medicines.filter((m) => {
    const q = medSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.genericName ?? "").toLowerCase().includes(q)
    );
  });

  const addToCart = (med: Medicine) => {
    const batches = batchMap[med._id] ?? [];
    const totalStock = batches.reduce((s, b) => s + b.quantity, 0);
    if (totalStock === 0) {
      addToast(`${med.name} is out of stock`, "error");
      return;
    }
    const existing = cart.find((c) => c.medicine._id === med._id);
    if (existing) {
      addToast(`${med.name} already in cart`, "error");
      return;
    }
    const unitPrice = batches[0]?.sellingPrice ?? 0;
    setCart((prev) => [...prev, { medicine: med, batches, availableStock: totalStock, unitPrice, quantity: 1 }]);
    setMedSearch("");
    setShowMedList(false);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.medicine._id !== id) return item;
      const newQty = Math.max(1, Math.min(item.availableStock, item.quantity + delta));
      return { ...item, quantity: newQty };
    }));
  };

  const setQty = (id: string, val: string) => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    setCart((prev) => prev.map((item) => {
      if (item.medicine._id !== id) return item;
      return { ...item, quantity: Math.max(1, Math.min(item.availableStock, n)) };
    }));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.medicine._id !== id));

  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const cartItemCount = cart.reduce((s, c) => s + c.quantity, 0);

  // ── Process sale ──────────────────────────────────────────────
  const processSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    const allSales: SaleRecord[] = [];
    const errors: string[] = [];

    for (const item of cart) {
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medicineId: item.medicine._id, quantity: item.quantity }),
        });
        const json = await res.json();
        if (json.success) {
          allSales.push(...json.data);
        } else {
          errors.push(`${item.medicine.name}: ${json.message}`);
        }
      } catch {
        errors.push(`${item.medicine.name}: Request failed`);
      }
    }

    if (errors.length > 0) {
      addToast(errors[0], "error");
    }
    if (allSales.length > 0) {
      setLastReceipt(allSales);
      setShowReceipt(true);
      setCart([]);
      addToast("Sale completed successfully!", "success");
    }
    setProcessing(false);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Toast */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto
              ${t.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {t.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sales / POS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Process sales with automatic FEFO batch selection and view history.
          </p>
        </div>
        {/* Tab switcher */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setTab("pos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === "pos" ? "bg-white text-[#188FA7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <ShoppingCart className="w-4 h-4" /> POS
          </button>
          <button onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === "history" ? "bg-white text-[#188FA7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Receipt className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {/* ── POS TAB ─────────────────────────────────────────────── */}
      {tab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Medicine search + cart items */}
          <div className="lg:col-span-2 space-y-4">

            {/* Medicine search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">Add Medicine to Cart</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => { setMedSearch(e.target.value); setShowMedList(true); }}
                  onFocus={() => setShowMedList(true)}
                  placeholder="Search medicine by name or generic name..."
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]"
                />
                {showMedList && medSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto">
                    {filteredMeds.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
                        <Pill className="w-4 h-4" /> No medicines found
                      </div>
                    ) : filteredMeds.map((med) => {
                      const stock = (batchMap[med._id] ?? []).reduce((s, b) => s + b.quantity, 0);
                      const inCart = cart.some((c) => c.medicine._id === med._id);
                      return (
                        <button key={med._id}
                          disabled={stock === 0 || inCart}
                          onClick={() => addToCart(med)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors disabled:opacity-40 border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{med.name}</p>
                            <p className="text-xs text-gray-400">{med.genericName ?? med.category ?? ""}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-medium ${stock === 0 ? "text-red-500" : "text-emerald-600"}`}>
                              {stock === 0 ? "Out of stock" : `${stock} units`}
                            </p>
                            {inCart && <p className="text-xs text-blue-500">In cart</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {showMedList && <div className="fixed inset-0 z-20" onClick={() => setShowMedList(false)} />}
            </div>

            {/* Cart items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">
                  Cart {cart.length > 0 && <span className="ml-1 text-sm text-gray-400">({cart.length} item{cart.length !== 1 ? "s" : ""})</span>}
                </h2>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ShoppingCart className="w-14 h-14 mb-3 opacity-20" />
                  <p className="text-sm font-medium text-gray-500">Cart is empty</p>
                  <p className="text-xs mt-1">Search and add medicines above</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => {
                    const earliest = item.batches[0];
                    const days = earliest ? daysUntil(earliest.expirationDate) : 0;
                    return (
                      <div key={item.medicine._id} className="p-4 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{item.medicine.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400">{item.medicine.category}</span>
                            {earliest && (
                              <span className={`text-xs font-medium ${days <= 30 ? "text-orange-500" : "text-gray-400"}`}>
                                Batch: {earliest.batchNumber} · expires in {days}d
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Stock: {item.availableStock}</span>
                            <span className="text-xs text-gray-300">|</span>
                            <span className="text-xs text-gray-500">{formatINR(item.unitPrice)}/unit</span>
                          </div>
                        </div>

                        {/* Qty control */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateQty(item.medicine._id, -1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number" min={1} max={item.availableStock}
                            value={item.quantity}
                            onChange={(e) => setQty(item.medicine._id, e.target.value)}
                            className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30"
                          />
                          <button onClick={() => updateQty(item.medicine._id, 1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line total */}
                        <div className="text-right shrink-0 min-w-[80px]">
                          <p className="text-sm font-bold text-gray-900">{formatINR(item.unitPrice * item.quantity)}</p>
                          <button onClick={() => removeFromCart(item.medicine._id)}
                            className="mt-1 text-red-400 hover:text-red-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h2 className="text-base font-bold text-gray-800 mb-4">Order Summary</h2>

              <div className="space-y-3 pb-4 border-b border-gray-100">
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No items in cart</p>
                ) : cart.map((item) => (
                  <div key={item.medicine._id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate max-w-[160px]">
                      {item.medicine.name} <span className="text-gray-400">×{item.quantity}</span>
                    </span>
                    <span className="font-medium text-gray-800 shrink-0">{formatINR(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({cartItemCount} units)</span>
                  <span className="font-medium">{formatINR(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax (0%)</span>
                  <span className="font-medium">₹0.00</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-100 mb-5">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-[#188FA7]">{formatINR(cartTotal)}</span>
              </div>

              {/* FEFO note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl mb-4 text-xs text-blue-700">
                <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>FEFO applied automatically — earliest-expiring batches are consumed first.</span>
              </div>

              <button
                onClick={processSale}
                disabled={cart.length === 0 || processing}
                className="w-full py-3.5 rounded-xl bg-[#188FA7] hover:bg-[#137a8f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {processing ? "Processing…" : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue",   val: formatINR(stats?.totalRevenue ?? 0),  icon: <IndianRupee className="w-5 h-5" />, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
              { label: "Today",           val: formatINR(stats?.todayRevenue ?? 0),   icon: <Clock className="w-5 h-5" />,        bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
              { label: "This Week",       val: formatINR(stats?.weekRevenue ?? 0),    icon: <TrendingUp className="w-5 h-5" />,   bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-100" },
              { label: "Total Sales",     val: (stats?.salesCount ?? 0) + " txns",   icon: <Receipt className="w-5 h-5" />,      bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-100" },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                <div className={s.text}>{s.icon}</div>
                <div>
                  <div className={`text-lg font-bold ${s.text} leading-tight`}>
                    {historyLoading ? <span className="inline-block w-14 h-4 bg-current opacity-20 rounded animate-pulse" /> : s.val}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Date filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">From Date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">To Date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]" />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                  <X className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Sales table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <p className="text-sm">Loading sales history…</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Receipt className="w-14 h-14 mb-4 opacity-20" />
                <p className="text-base font-semibold text-gray-500">No sales found</p>
                <p className="text-sm mt-1">
                  {dateFrom || dateTo ? "Try adjusting your date filter" : "Complete a sale from the POS tab to see it here"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-4 font-semibold">#</th>
                      <th className="px-5 py-4 font-semibold">Medicine</th>
                      <th className="px-5 py-4 font-semibold">Batch</th>
                      <th className="px-5 py-4 font-semibold">Qty</th>
                      <th className="px-5 py-4 font-semibold">Unit Price</th>
                      <th className="px-5 py-4 font-semibold">Total</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((s, i) => (
                      <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 leading-tight">{s.medicineId?.name ?? "—"}</p>
                              {s.medicineId?.category && (
                                <p className="text-xs text-gray-400">{s.medicineId.category}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                            {s.batchId?.batchNumber ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-800">{s.quantity}</td>
                        <td className="px-5 py-4 text-gray-600">{formatINR(s.unitPrice)}</td>
                        <td className="px-5 py-4 font-bold text-emerald-700">{formatINR(s.totalPrice)}</td>
                        <td className="px-5 py-4 text-gray-600">{formatDate(s.date)}</td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{formatTime(s.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
                  <span>{sales.length} transaction{sales.length !== 1 ? "s" : ""}</span>
                  <span>Total: <strong className="text-gray-700">
                    {formatINR(sales.reduce((s, r) => s + r.totalPrice, 0))}
                  </strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Receipt Modal ──────────────────────────────────────── */}
      {showReceipt && lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReceipt(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Receipt header */}
            <div className="bg-[#188FA7] p-6 text-center text-white">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold">Sale Complete!</h2>
              <p className="text-sm text-white/80 mt-1">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {lastReceipt.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-gray-800">{s.medicineId?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3" />
                        Batch: {(s.batchId as unknown as { batchNumber?: string })?.batchNumber ?? "—"} · ×{s.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-gray-800">{formatINR(s.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-base">Total Paid</span>
                  <span className="text-2xl font-bold text-[#188FA7]">
                    {formatINR(lastReceipt.reduce((s, r) => s + r.totalPrice, 0))}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700">
                <BadgeCheck className="w-4 h-4 shrink-0" />
                <span>FEFO batches consumed. Inventory updated automatically.</span>
              </div>

              <button onClick={() => setShowReceipt(false)}
                className="w-full py-3 rounded-xl bg-[#188FA7] hover:bg-[#137a8f] text-white font-bold text-sm transition-colors">
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
