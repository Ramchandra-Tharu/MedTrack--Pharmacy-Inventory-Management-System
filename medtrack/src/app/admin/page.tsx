"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Pill,
  Layers,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronDown,
  Circle,
  Settings,
  ShoppingCart,
  FileText,
  Camera,
  Loader2,
} from "lucide-react";

interface DashboardData {
  totalMedicines: number;
  totalBatches: number;
  totalStock: number;
  totalInventoryValue: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
}

interface BatchRow {
  _id: string;
  batchNumber: string;
  quantity: number;
  expirationDate: string;
  purchasePrice: number;
  sellingPrice: number;
  medicineId: {
    _id: string;
    name: string;
    category?: string;
  } | null;
}

interface StockStatus {
  healthy: number;
  expiringSoon: number;
  critical: number;
  expired: number;
  total: number;
}

interface CategoryData {
  label: string;
  val: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Painkillers: "bg-blue-500",
  Antibiotics: "bg-emerald-400",
  Vitamins: "bg-purple-400",
  Diabetes: "bg-orange-400",
  Cardiac: "bg-red-400",
  Others: "bg-teal-400",
};

function getBatchStatus(expirationDate: string): "Expired" | "Expiring Soon" | "Safe" {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  if (expiry < now) return "Expired";
  if (expiry <= thirtyDays) return "Expiring Soon";
  return "Safe";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return `₹ ${amount.toLocaleString("en-IN")}`;
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  unit,
  change,
  changeType,
  changeLabel,
  loading,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  changeLabel?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-[140px]">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 ${iconBg} rounded-xl`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : (
          <>
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </>
        )}
      </div>
      <div className="flex items-center text-xs mt-2">
        {changeType === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />}
        {changeType === "down" && <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />}
        <span
          className={
            changeType === "up"
              ? "text-emerald-500 font-medium mr-1"
              : changeType === "down"
              ? "text-red-500 font-medium mr-1"
              : "text-gray-400"
          }
        >
          {change ?? "—"}
        </span>
        {changeLabel && <span className="text-gray-400">{changeLabel}</span>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [recentBatches, setRecentBatches] = useState<BatchRow[]>([]);
  const [stockStatus, setStockStatus] = useState<StockStatus>({
    healthy: 0,
    expiringSoon: 0,
    critical: 0,
    expired: 0,
    total: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [dashRes, batchRes, salesRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/batches"),
          fetch("/api/sales?from=" + new Date().toISOString().split("T")[0]),
        ]);

        const dashJson = await dashRes.json();
        const batchJson = await batchRes.json();
        const salesJson = await salesRes.json();

        if (dashJson.success) {
          setStats(dashJson.data);
        }

        if (batchJson.success) {
          const batches: BatchRow[] = batchJson.data;

          // Recent 8 batches
          setRecentBatches(batches.slice(0, 8));

          // Stock status counts
          const now = new Date();
          const thirtyDays = new Date();
          thirtyDays.setDate(thirtyDays.getDate() + 30);
          const sixtyDays = new Date();
          sixtyDays.setDate(sixtyDays.getDate() + 60);

          const expired = batches.filter(
            (b) => new Date(b.expirationDate) < now && b.quantity > 0
          ).length;
          const expiringSoon = batches.filter(
            (b) =>
              new Date(b.expirationDate) >= now &&
              new Date(b.expirationDate) <= thirtyDays &&
              b.quantity > 0
          ).length;
          const critical = batches.filter(
            (b) =>
              new Date(b.expirationDate) > thirtyDays &&
              new Date(b.expirationDate) <= sixtyDays &&
              b.quantity > 0
          ).length;
          const healthy = batches.filter(
            (b) => new Date(b.expirationDate) > sixtyDays && b.quantity > 0
          ).length;

          setStockStatus({
            expired,
            expiringSoon,
            critical,
            healthy,
            total: batches.length,
          });

          // Category breakdown
          const categoryMap: Record<string, number> = {};
          batches.forEach((b) => {
            const cat =
              (b.medicineId as unknown as { category?: string })?.category ||
              "Others";
            categoryMap[cat] = (categoryMap[cat] || 0) + b.quantity;
          });

          const knownCategories = [
            "Painkillers",
            "Antibiotics",
            "Vitamins",
            "Diabetes",
            "Cardiac",
          ];
          const cats: CategoryData[] = knownCategories
            .filter((c) => categoryMap[c] !== undefined)
            .map((c) => ({
              label: c,
              val: categoryMap[c],
              color: CATEGORY_COLORS[c],
            }));

          const othersTotal = Object.entries(categoryMap)
            .filter(([k]) => !knownCategories.includes(k))
            .reduce((s, [, v]) => s + v, 0);

          if (othersTotal > 0 || cats.length === 0) {
            cats.push({
              label: "Others",
              val: othersTotal,
              color: CATEGORY_COLORS["Others"],
            });
          }

          setCategoryData(cats);
        }

        if (salesJson.success) {
          const total = salesJson.data.reduce(
            (sum: number, s: { totalPrice?: number; quantity?: number; sellingPrice?: number }) =>
              sum + (s.totalPrice ?? 0),
            0
          );
          setTodaySales(total);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const maxCatVal = Math.max(...categoryData.map((c) => c.val), 1);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const greetingHour = now.getHours();
  const greeting =
    greetingHour < 12
      ? "Good Morning"
      : greetingHour < 17
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {greeting}, Admin!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your pharmacy today.
          </p>
        </div>
        <div className="flex items-center text-sm text-gray-600 font-medium">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{dateLabel}</span>
          <span className="mx-3 text-gray-300">|</span>
          <span>{timeLabel}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={<Package className="w-6 h-6" />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          label="Total Stock"
          value={stats?.totalStock ?? 0}
          unit="units"
          changeType="neutral"
          loading={loading}
        />
        <StatCard
          icon={<Pill className="w-6 h-6" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Total Medicines"
          value={stats?.totalMedicines ?? 0}
          unit="items"
          changeType="neutral"
          loading={loading}
        />
        <StatCard
          icon={<Layers className="w-6 h-6" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="Total Batches"
          value={stats?.totalBatches ?? 0}
          unit="batches"
          changeType="neutral"
          loading={loading}
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBg="bg-orange-100"
          iconColor="text-orange-500"
          label="Expiry Risk"
          value={stats?.expiredCount ?? 0}
          unit="batches"
          changeType="neutral"
          loading={loading}
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
          label="Today's Sales"
          value={formatCurrency(todaySales)}
          changeType="neutral"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Inventory Overview Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-gray-900">Inventory Overview</h2>
              <button className="flex items-center text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                Stock level <ChevronDown className="w-4 h-4 ml-2" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Stock level by category</p>

            {loading ? (
              <div className="h-[220px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              </div>
            ) : categoryData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                <Package className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No stock data yet</p>
              </div>
            ) : (
              <div className="relative h-[250px] w-full">
                {/* Y-axis grid lines */}
                <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pb-8">
                  {[100, 75, 50, 25, 0].map((pct, idx) => (
                    <div key={idx} className="flex items-center w-full">
                      <span className="text-xs text-gray-400 w-10 text-right mr-3">
                        {Math.round((pct / 100) * maxCatVal)}
                      </span>
                      <div className="flex-1 border-t border-gray-100" />
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="absolute left-12 right-4 bottom-8 top-0 flex items-end justify-around gap-2">
                  {categoryData.map((item) => (
                    <div key={item.label} className="flex flex-col items-center w-full">
                      <span className="text-xs font-medium text-gray-600 mb-1">{item.val}</span>
                      <div
                        className={`w-full ${item.color} rounded-t-sm transition-all`}
                        style={{ height: `${(item.val / maxCatVal) * 160}px` }}
                      />
                      <span className="text-[10px] text-gray-500 mt-2 text-center leading-tight">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Inventory Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recent Inventory</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Latest stock updates and batch information
                </p>
              </div>
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
                View All
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              </div>
            ) : recentBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No batches added yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Medicine</th>
                      <th className="px-6 py-4 font-medium">Batch No.</th>
                      <th className="px-6 py-4 font-medium">Quantity</th>
                      <th className="px-6 py-4 font-medium">Expiry Date</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">FEFO Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentBatches.map((row, i) => {
                      const status = getBatchStatus(row.expirationDate);
                      return (
                        <tr key={row._id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-blue-400 shrink-0" />
                              {row.medicineId?.name ?? "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{row.batchNumber}</td>
                          <td className="px-6 py-4 text-gray-600">{row.quantity}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(row.expirationDate)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                status === "Expired"
                                  ? "bg-red-100 text-red-600"
                                  : status === "Expiring Soon"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="w-6 h-6 inline-flex items-center justify-center bg-emerald-50 text-emerald-600 rounded text-xs font-bold">
                              {i + 1}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Expiry Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold text-gray-900">Expiry Alerts</h2>
              </div>
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
                View All
              </button>
            </div>

            <div className="space-y-5">
              {[
                {
                  label: "Expired",
                  color: "bg-red-500",
                  ring: "ring-red-50",
                  textColor: "text-red-500",
                  val: stockStatus.expired,
                },
                {
                  label: "Expiring Soon (≤ 30 days)",
                  color: "bg-orange-400",
                  ring: "ring-orange-50",
                  textColor: "text-orange-400",
                  val: stockStatus.expiringSoon,
                },
                {
                  label: "Critical (≤ 60 days)",
                  color: "bg-yellow-400",
                  ring: "ring-yellow-50",
                  textColor: "text-yellow-500",
                  val: stockStatus.critical,
                },
                {
                  label: "Safe",
                  color: "bg-emerald-500",
                  ring: "ring-emerald-50",
                  textColor: "text-emerald-500",
                  val: stockStatus.healthy,
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color} ring-4 ${item.ring}`} />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <div className="text-right">
                    {loading ? (
                      <div className="w-4 h-4 rounded bg-gray-100 animate-pulse" />
                    ) : (
                      <>
                        <div className={`text-base font-bold ${item.textColor}`}>{item.val}</div>
                        <div className="text-xs text-gray-400">batches</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Status Donut */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Stock Status</h2>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Total Batches: {loading ? "…" : stockStatus.total}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-28">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              </div>
            ) : stockStatus.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-gray-400">
                <Layers className="w-8 h-8 mb-1 opacity-30" />
                <p className="text-xs">No batch data</p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                {/* SVG Donut */}
                <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                  {(() => {
                    const total = stockStatus.total || 1;
                    const circumference = 2 * Math.PI * 40;
                    const segments = [
                      { val: stockStatus.healthy, color: "#10b981" },
                      { val: stockStatus.expiringSoon, color: "#fbbf24" },
                      { val: stockStatus.critical, color: "#f97316" },
                      { val: stockStatus.expired, color: "#ef4444" },
                    ];
                    let offset = 0;
                    return (
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {segments.map((seg, i) => {
                          const dash = (seg.val / total) * circumference;
                          const gap = circumference - dash;
                          const el = (
                            <circle
                              key={i}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="15"
                              strokeDasharray={`${dash} ${gap}`}
                              strokeDashoffset={-offset}
                            />
                          );
                          offset += dash;
                          return el;
                        })}
                      </svg>
                    );
                  })()}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold text-gray-900">{stockStatus.total}</span>
                    <span className="text-xs text-gray-500">batches</span>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1">
                  {[
                    { label: "Healthy", color: "fill-emerald-500 text-emerald-500", val: stockStatus.healthy, total: stockStatus.total },
                    { label: "Expiring Soon", color: "fill-yellow-400 text-yellow-400", val: stockStatus.expiringSoon, total: stockStatus.total },
                    { label: "Critical", color: "fill-orange-500 text-orange-500", val: stockStatus.critical, total: stockStatus.total },
                    { label: "Expired", color: "fill-red-500 text-red-500", val: stockStatus.expired, total: stockStatus.total },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <Circle className={`w-2.5 h-2.5 ${item.color} shrink-0`} />
                      <span className="w-24 text-gray-600 truncate">{item.label}</span>
                      <span className="font-medium">
                        {item.val} ({item.total > 0 ? Math.round((item.val / item.total) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm font-medium">
              <button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                <Pill className="w-4 h-4" /> Add Medicine
              </button>
              <button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Package className="w-4 h-4" /> Add Batch
              </button>
              <button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                <ShoppingCart className="w-4 h-4" /> Create Sale
              </button>
              <button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" /> View Expiry Alerts
              </button>
              <button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                <FileText className="w-4 h-4" /> Generate Report
              </button>
              <button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                <Camera className="w-4 h-4" /> OCR Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
