"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Pill,
  IndianRupee,
  CalendarDays,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Ban,
  Loader2,
  Download,
  Printer,
  Search,
  X,
  ChevronDown,
  FileText,
  Activity,
  Layers,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  CircleDollarSign,
  PieChart,
  Receipt,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface DashboardData {
  totalMedicines: number;
  totalBatches: number;
  totalStock: number;
  totalInventoryValue: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
}

interface SalesStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  salesCount: number;
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

interface BatchRecord {
  _id: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expirationDate: string;
  medicineId: { _id: string; name: string; category?: string } | null;
}

interface MedicineRecord {
  _id: string;
  name: string;
  genericName?: string;
  category?: string;
  status: string;
}

type ReportType = "overview" | "sales" | "inventory" | "expiry" | "products";

// ── Helpers ────────────────────────────────────────────────────
function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d: string) {
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(d); exp.setHours(0,0,0,0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Simple bar chart component ─────────────────────────────────
function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-500 font-bold">{d.value > 0 ? d.value : ""}</span>
          <div className="w-full rounded-t-md transition-all" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0, backgroundColor: color }} />
          <span className="text-[10px] text-gray-400 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal progress row ────────────────────────────────────
function ProgressRow({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium truncate max-w-[200px]">{label}</span>
        <span className="font-bold text-gray-800">{value}{suffix}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [loading, setLoading] = useState(true);

  // Data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Fetch all data ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, statsRes, salesRes, batchRes, medRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/sales/stats"),
        fetch(`/api/sales?${dateFrom ? `from=${dateFrom}` : ""}${dateTo ? `&to=${dateTo}` : ""}`),
        fetch("/api/batches"),
        fetch("/api/medicines"),
      ]);
      const [dj, stj, slj, bj, mj] = await Promise.all([
        dashRes.json(), statsRes.json(), salesRes.json(), batchRes.json(), medRes.json(),
      ]);
      if (dj.success) setDashboard(dj.data);
      if (stj.success) setSalesStats(stj.data);
      if (slj.success) setSales(slj.data);
      if (bj.success) setBatches(bj.data);
      if (mj.success) setMedicines(mj.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Computed data ─────────────────────────────────────────────

  // Sales by medicine (top sellers)
  const salesByMedicine = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const s of sales) {
      const id = s.medicineId?._id ?? "unknown";
      const name = s.medicineId?.name ?? "Unknown";
      if (!map[id]) map[id] = { name, qty: 0, revenue: 0 };
      map[id].qty += s.quantity;
      map[id].revenue += s.totalPrice;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  // Sales by category
  const salesByCategory = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    for (const s of sales) {
      const cat = s.medicineId?.category ?? "Uncategorized";
      if (!map[cat]) map[cat] = { qty: 0, revenue: 0 };
      map[cat].qty += s.quantity;
      map[cat].revenue += s.totalPrice;
    }
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [sales]);

  // Daily sales for bar chart (last 7 days)
  const dailySales = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayTotal = sales
        .filter(s => { const sd = new Date(s.date); return sd >= d && sd < next; })
        .reduce((sum, s) => sum + s.totalPrice, 0);
      days.push({ label: d.toLocaleDateString("en-IN", { weekday: "short" }), value: Math.round(dayTotal) });
    }
    return days;
  }, [sales]);

  // Inventory by category
  const inventoryByCategory = useMemo(() => {
    const map: Record<string, { stock: number; value: number; batches: number }> = {};
    for (const b of batches) {
      const cat = b.medicineId?.category ?? "Uncategorized";
      if (!map[cat]) map[cat] = { stock: 0, value: 0, batches: 0 };
      map[cat].stock += b.quantity;
      map[cat].value += b.quantity * b.purchasePrice;
      map[cat].batches++;
    }
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
  }, [batches]);

  // Expiry breakdown
  const expiryBreakdown = useMemo(() => {
    const expired: BatchRecord[] = [];
    const critical: BatchRecord[] = [];
    const warning: BatchRecord[] = [];
    const safe: BatchRecord[] = [];
    for (const b of batches) {
      if (b.quantity === 0) continue;
      const d = daysUntil(b.expirationDate);
      if (d <= 0) expired.push(b);
      else if (d <= 30) critical.push(b);
      else if (d <= 90) warning.push(b);
      else safe.push(b);
    }
    return { expired, critical, warning, safe };
  }, [batches]);

  // Low stock items
  const lowStockItems = useMemo(() => {
    const map: Record<string, { name: string; stock: number; category: string }> = {};
    for (const b of batches) {
      const id = b.medicineId?._id ?? "unknown";
      const name = b.medicineId?.name ?? "Unknown";
      const cat = b.medicineId?.category ?? "";
      if (!map[id]) map[id] = { name, stock: 0, category: cat };
      map[id].stock += b.quantity;
    }
    return Object.values(map).filter(m => m.stock > 0 && m.stock <= 10).sort((a, b) => a.stock - b.stock);
  }, [batches]);

  // Profit margin analysis
  const profitAnalysis = useMemo(() => {
    const map: Record<string, { name: string; cost: number; revenue: number }> = {};
    for (const s of sales) {
      const id = s.medicineId?._id ?? "unknown";
      const name = s.medicineId?.name ?? "Unknown";
      if (!map[id]) map[id] = { name, cost: 0, revenue: 0 };
      map[id].revenue += s.totalPrice;
      // Find batch cost
      const batch = batches.find(b => b._id === (s.batchId?._id ?? ""));
      if (batch) map[id].cost += s.quantity * batch.purchasePrice;
    }
    return Object.values(map)
      .map(m => ({ ...m, profit: m.revenue - m.cost, margin: m.revenue > 0 ? ((m.revenue - m.cost) / m.revenue) * 100 : 0 }))
      .sort((a, b) => b.profit - a.profit);
  }, [sales, batches]);

  // Total inventory value from active batches
  const totalInvValue = batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
  const totalSellingValue = batches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0);
  const potentialProfit = totalSellingValue - totalInvValue;

  // ── Export handlers ───────────────────────────────────────────
  const exportSalesReport = () => {
    exportCSV("sales_report.csv",
      ["Date", "Medicine", "Category", "Batch", "Qty", "Unit Price", "Total"],
      sales.map(s => [
        formatDate(s.date), s.medicineId?.name ?? "—", s.medicineId?.category ?? "—",
        s.batchId?.batchNumber ?? "—", s.quantity.toString(), s.unitPrice.toString(), s.totalPrice.toString(),
      ])
    );
  };

  const exportInventoryReport = () => {
    exportCSV("inventory_report.csv",
      ["Medicine", "Category", "Batch", "Stock", "Purchase Price", "Selling Price", "Expiry Date", "Days Left", "Value"],
      batches.map(b => [
        b.medicineId?.name ?? "—", b.medicineId?.category ?? "—", b.batchNumber,
        b.quantity.toString(), b.purchasePrice.toString(), b.sellingPrice.toString(),
        formatDate(b.expirationDate), daysUntil(b.expirationDate).toString(),
        (b.quantity * b.purchasePrice).toString(),
      ])
    );
  };

  const exportExpiryReport = () => {
    const atRisk = [...expiryBreakdown.expired, ...expiryBreakdown.critical, ...expiryBreakdown.warning];
    exportCSV("expiry_report.csv",
      ["Medicine", "Batch", "Stock", "Expiry Date", "Days Left", "Status", "Value at Risk"],
      atRisk.map(b => {
        const d = daysUntil(b.expirationDate);
        const status = d <= 0 ? "Expired" : d <= 30 ? "Critical" : "Warning";
        return [
          b.medicineId?.name ?? "—", b.batchNumber, b.quantity.toString(),
          formatDate(b.expirationDate), d.toString(), status,
          (b.quantity * b.purchasePrice).toString(),
        ];
      })
    );
  };

  // ── Report tabs config ────────────────────────────────────────
  const tabs: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: "overview",  label: "Overview",  icon: <BarChart3 className="w-4 h-4" /> },
    { key: "sales",     label: "Sales",     icon: <TrendingUp className="w-4 h-4" /> },
    { key: "inventory", label: "Inventory", icon: <Package className="w-4 h-4" /> },
    { key: "expiry",    label: "Expiry",    icon: <AlertTriangle className="w-4 h-4" /> },
    { key: "products",  label: "Products",  icon: <Pill className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading reports…</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive analytics and insights across your pharmacy.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border-0 focus:outline-none text-gray-600 w-28" />
            <span className="text-gray-300">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border-0 focus:outline-none text-gray-600 w-28" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report tabs */}
      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setReportType(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
              ${reportType === t.key ? "bg-white text-[#188FA7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OVERVIEW REPORT                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {reportType === "overview" && (
        <div className="space-y-6">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue",     val: formatINR(salesStats?.totalRevenue ?? 0), icon: <IndianRupee className="w-5 h-5" />, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
              { label: "Inventory Value",   val: formatINR(totalInvValue),                  icon: <Boxes className="w-5 h-5" />,       bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
              { label: "Potential Profit",  val: formatINR(potentialProfit),                 icon: <CircleDollarSign className="w-5 h-5" />, bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
              { label: "Active Medicines",  val: (dashboard?.totalMedicines ?? 0).toString(), icon: <Pill className="w-5 h-5" />,      bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-100" },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                <div className={s.text}>{s.icon}</div>
                <div>
                  <div className={`text-lg font-bold ${s.text} leading-tight`}>{s.val}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Daily sales chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#188FA7]" /> Daily Revenue (Last 7 Days)
              </h3>
              <MiniBarChart data={dailySales} color="#188FA7" />
            </div>

            {/* Sales by category */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#188FA7]" /> Revenue by Category
              </h3>
              {salesByCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No sales data</p>
              ) : (
                <div className="space-y-3">
                  {salesByCategory.slice(0, 6).map(([cat, d]) => (
                    <ProgressRow key={cat} label={cat} value={Math.round(d.revenue)} max={salesByCategory[0]?.[1]?.revenue ?? 1} color="#188FA7" suffix="" />
                  ))}
                </div>
              )}
            </div>

            {/* Alerts summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#188FA7]" /> Inventory Alerts
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <Ban className="w-4 h-4" /> Expired Batches
                  </div>
                  <span className="text-lg font-bold text-red-700">{dashboard?.expiredCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                    <ShieldAlert className="w-4 h-4" /> Expiring Soon (30d)
                  </div>
                  <span className="text-lg font-bold text-orange-700">{dashboard?.expiringSoonCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
                    <AlertTriangle className="w-4 h-4" /> Low Stock Items
                  </div>
                  <span className="text-lg font-bold text-yellow-700">{dashboard?.lowStockCount ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#188FA7]" /> Revenue Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Today",      val: formatINR(salesStats?.todayRevenue ?? 0), color: "text-emerald-600" },
                  { label: "This Week",  val: formatINR(salesStats?.weekRevenue ?? 0),  color: "text-blue-600" },
                  { label: "This Month", val: formatINR(salesStats?.monthRevenue ?? 0), color: "text-purple-600" },
                  { label: "All Time",   val: formatINR(salesStats?.totalRevenue ?? 0), color: "text-gray-900" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color}`}>{r.val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">Total Transactions</span>
                  <span className="text-sm font-bold text-gray-900">{salesStats?.salesCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SALES REPORT                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {reportType === "sales" && (
        <div className="space-y-6">

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Sales Analysis</h2>
            <button onClick={exportSalesReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#188FA7] text-white text-sm font-bold hover:bg-[#137a8f] transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Revenue cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", val: formatINR(sales.reduce((s, r) => s + r.totalPrice, 0)), bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", icon: <IndianRupee className="w-5 h-5" /> },
              { label: "Units Sold",    val: sales.reduce((s, r) => s + r.quantity, 0).toString(),    bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100",    icon: <ShoppingCart className="w-5 h-5" /> },
              { label: "Transactions",  val: sales.length.toString(),                                  bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-100",  icon: <Receipt className="w-5 h-5" /> },
              { label: "Avg Sale",      val: sales.length > 0 ? formatINR(sales.reduce((s, r) => s + r.totalPrice, 0) / sales.length) : "₹0.00", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", icon: <Activity className="w-5 h-5" /> },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                <div className={s.text}>{s.icon}</div>
                <div>
                  <div className={`text-lg font-bold ${s.text} leading-tight`}>{s.val}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Daily chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Daily Revenue (7 Days)</h3>
              <MiniBarChart data={dailySales} color="#10b981" />
            </div>

            {/* Top sellers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Top Selling Medicines</h3>
              {salesByMedicine.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No sales data</p>
              ) : (
                <div className="space-y-3">
                  {salesByMedicine.slice(0, 8).map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? "bg-[#188FA7] text-white" : "bg-gray-100 text-gray-500"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.qty} units sold</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700 shrink-0">{formatINR(m.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Sales by Category</h3>
            </div>
            {salesByCategory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No sales data</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Category</th>
                    <th className="px-5 py-3 text-right font-semibold">Units Sold</th>
                    <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                    <th className="px-5 py-3 text-right font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesByCategory.map(([cat, d]) => {
                    const totalRev = sales.reduce((s, r) => s + r.totalPrice, 0);
                    const share = totalRev > 0 ? (d.revenue / totalRev) * 100 : 0;
                    return (
                      <tr key={cat} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-semibold text-gray-900">{cat}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{d.qty}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatINR(d.revenue)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xs font-bold text-[#188FA7] bg-[#188FA7]/10 px-2 py-0.5 rounded-full">{share.toFixed(1)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* INVENTORY REPORT                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {reportType === "inventory" && (
        <div className="space-y-6">

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Inventory Analysis</h2>
            <button onClick={exportInventoryReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#188FA7] text-white text-sm font-bold hover:bg-[#137a8f] transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Stock",      val: (dashboard?.totalStock ?? 0) + " units",  bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100",    icon: <Package className="w-5 h-5" /> },
              { label: "Purchase Value",   val: formatINR(totalInvValue),                    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", icon: <IndianRupee className="w-5 h-5" /> },
              { label: "Selling Value",    val: formatINR(totalSellingValue),                 bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-100",  icon: <CircleDollarSign className="w-5 h-5" /> },
              { label: "Total Batches",    val: (dashboard?.totalBatches ?? 0).toString(),    bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-100",  icon: <Layers className="w-5 h-5" /> },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                <div className={s.text}>{s.icon}</div>
                <div>
                  <div className={`text-lg font-bold ${s.text} leading-tight`}>{s.val}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Stock by category */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Stock by Category</h3>
              {inventoryByCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No inventory data</p>
              ) : (
                <div className="space-y-3">
                  {inventoryByCategory.map(([cat, d]) => (
                    <ProgressRow key={cat} label={`${cat} (${d.batches} batches)`}
                      value={d.stock} max={inventoryByCategory[0]?.[1]?.stock ?? 1} color="#3b82f6" suffix=" units" />
                  ))}
                </div>
              )}
            </div>

            {/* Value by category */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Value by Category</h3>
              {inventoryByCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No inventory data</p>
              ) : (
                <div className="space-y-3">
                  {inventoryByCategory.map(([cat, d]) => (
                    <ProgressRow key={cat} label={cat}
                      value={Math.round(d.value)} max={inventoryByCategory[0]?.[1]?.value ?? 1} color="#8b5cf6" suffix="" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Low stock alert table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" /> Low Stock Alert (≤ 10 units)
              </h3>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No low stock items</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">#</th>
                    <th className="px-5 py-3 text-left font-semibold">Medicine</th>
                    <th className="px-5 py-3 text-left font-semibold">Category</th>
                    <th className="px-5 py-3 text-right font-semibold">Remaining Stock</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStockItems.map((m, i) => (
                    <tr key={i} className="hover:bg-yellow-50/30">
                      <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{m.name}</td>
                      <td className="px-5 py-3 text-gray-500">{m.category || "—"}</td>
                      <td className="px-5 py-3 text-right font-bold text-yellow-700">{m.stock} units</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.stock <= 3 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {m.stock <= 3 ? "Critical" : "Low"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EXPIRY REPORT                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {reportType === "expiry" && (
        <div className="space-y-6">

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Expiry Analysis</h2>
            <button onClick={exportExpiryReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#188FA7] text-white text-sm font-bold hover:bg-[#137a8f] transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Zone cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Expired",      count: expiryBreakdown.expired.length,  bg: "bg-red-50",     text: "text-red-700",    border: "border-red-100",    icon: <Ban className="w-5 h-5" /> },
              { label: "Critical ≤30d", count: expiryBreakdown.critical.length, bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-100", icon: <ShieldAlert className="w-5 h-5" /> },
              { label: "Warning ≤90d",  count: expiryBreakdown.warning.length,  bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-100", icon: <AlertTriangle className="w-5 h-5" /> },
              { label: "Safe >90d",    count: expiryBreakdown.safe.length,     bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-100",icon: <Package className="w-5 h-5" /> },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                <div className={s.text}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-bold ${s.text} leading-tight`}>{s.count}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* At-risk value */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Value at Risk</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Expired Stock Value",  val: expiryBreakdown.expired.reduce((s, b) => s + b.quantity * b.purchasePrice, 0),  color: "text-red-700" },
                { label: "Critical Stock Value", val: expiryBreakdown.critical.reduce((s, b) => s + b.quantity * b.purchasePrice, 0), color: "text-orange-700" },
                { label: "Warning Stock Value",  val: expiryBreakdown.warning.reduce((s, b) => s + b.quantity * b.purchasePrice, 0),  color: "text-yellow-700" },
              ].map(r => (
                <div key={r.label} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className={`text-xl font-bold ${r.color}`}>{formatINR(r.val)}</p>
                  <p className="text-xs text-gray-500 mt-1">{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expiry distribution bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Expiry Distribution</h3>
            <MiniBarChart data={[
              { label: "Expired", value: expiryBreakdown.expired.length },
              { label: "≤30d", value: expiryBreakdown.critical.length },
              { label: "≤90d", value: expiryBreakdown.warning.length },
              { label: ">90d", value: expiryBreakdown.safe.length },
            ]} color="#ef4444" />
          </div>

          {/* At-risk items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">At-Risk Batches (Expired + Critical + Warning)</h3>
            </div>
            {[...expiryBreakdown.expired, ...expiryBreakdown.critical, ...expiryBreakdown.warning].length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No at-risk batches — all inventory is safe!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Medicine</th>
                      <th className="px-5 py-3 text-left font-semibold">Batch</th>
                      <th className="px-5 py-3 text-right font-semibold">Stock</th>
                      <th className="px-5 py-3 text-left font-semibold">Expiry</th>
                      <th className="px-5 py-3 text-right font-semibold">Days</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                      <th className="px-5 py-3 text-right font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...expiryBreakdown.expired, ...expiryBreakdown.critical, ...expiryBreakdown.warning]
                      .sort((a, b) => daysUntil(a.expirationDate) - daysUntil(b.expirationDate))
                      .map((b) => {
                        const d = daysUntil(b.expirationDate);
                        const zone = d <= 0 ? "expired" : d <= 30 ? "critical" : "warning";
                        const colors = { expired: "bg-red-100 text-red-700", critical: "bg-orange-100 text-orange-700", warning: "bg-yellow-100 text-yellow-700" };
                        const labels = { expired: "Expired", critical: "Critical", warning: "Warning" };
                        return (
                          <tr key={b._id} className={`${zone === "expired" ? "bg-red-50/30" : ""} hover:bg-gray-50/50`}>
                            <td className="px-5 py-3 font-semibold text-gray-900">{b.medicineId?.name ?? "—"}</td>
                            <td className="px-5 py-3"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{b.batchNumber}</span></td>
                            <td className="px-5 py-3 text-right font-bold text-gray-800">{b.quantity}</td>
                            <td className="px-5 py-3 text-gray-600">{formatDate(b.expirationDate)}</td>
                            <td className="px-5 py-3 text-right font-bold" style={{ color: zone === "expired" ? "#b91c1c" : zone === "critical" ? "#c2410c" : "#a16207" }}>
                              {d <= 0 ? `${Math.abs(d)}d over` : `${d}d`}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[zone]}`}>{labels[zone]}</span>
                            </td>
                            <td className="px-5 py-3 text-right text-gray-600">{formatINR(b.quantity * b.purchasePrice)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRODUCTS REPORT                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {reportType === "products" && (
        <div className="space-y-6">

          <h2 className="text-base font-bold text-gray-800">Product Performance</h2>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Products",  val: medicines.length.toString(),                                     bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100",    icon: <Pill className="w-5 h-5" /> },
              { label: "Active",          val: medicines.filter(m => m.status === "active").length.toString(),   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", icon: <ArrowUpRight className="w-5 h-5" /> },
              { label: "Inactive",        val: medicines.filter(m => m.status !== "active").length.toString(),   bg: "bg-gray-100",   text: "text-gray-600",    border: "border-gray-200",    icon: <ArrowDownRight className="w-5 h-5" /> },
              { label: "Categories",      val: new Set(medicines.map(m => m.category).filter(Boolean)).size.toString(), bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", icon: <Layers className="w-5 h-5" /> },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                <div className={s.text}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-bold ${s.text} leading-tight`}>{s.val}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Profit margin analysis */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-[#188FA7]" /> Profit Margin Analysis
              </h3>
            </div>
            {profitAnalysis.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No sales data to analyze</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">#</th>
                      <th className="px-5 py-3 text-left font-semibold">Medicine</th>
                      <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                      <th className="px-5 py-3 text-right font-semibold">Cost</th>
                      <th className="px-5 py-3 text-right font-semibold">Profit</th>
                      <th className="px-5 py-3 text-right font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profitAnalysis.slice(0, 15).map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-gray-900">{m.name}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{formatINR(m.revenue)}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{formatINR(m.cost)}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatINR(m.profit)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.margin >= 30 ? "bg-emerald-100 text-emerald-700" : m.margin >= 15 ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {m.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Products by category chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Products by Category</h3>
            {(() => {
              const catMap: Record<string, number> = {};
              for (const m of medicines) { const c = m.category || "Uncategorized"; catMap[c] = (catMap[c] || 0) + 1; }
              const data = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
              return data.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No product data</p>
                : <MiniBarChart data={data} color="#8b5cf6" />;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
