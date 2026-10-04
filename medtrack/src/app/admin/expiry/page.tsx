"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  CalendarDays,
  Pill,
  Timer,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  X,
  ChevronDown,
  Activity,
  Ban,
  RotateCcw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface BatchData {
  _id: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expirationDate: string;
  receivedDate: string;
  medicineId: {
    _id: string;
    name: string;
    genericName?: string;
    category?: string;
  } | null;
}

type ExpiryZone = "expired" | "critical" | "warning" | "safe";
type SortKey = "daysLeft" | "name" | "quantity" | "expirationDate" | "value";
type SortDir = "asc" | "desc";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

// ── Helpers ────────────────────────────────────────────────────
function daysUntilExpiry(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

function getExpiryZone(days: number): ExpiryZone {
  if (days <= 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 90) return "warning";
  return "safe";
}

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const ZONE_CONFIG: Record<ExpiryZone, { label: string; color: string; bg: string; border: string; badge: string; icon: React.ReactNode }> = {
  expired:  { label: "Expired",         color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200",    badge: "bg-red-100 text-red-700",       icon: <Ban className="w-4 h-4" /> },
  critical: { label: "Critical (≤30d)", color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", badge: "bg-orange-100 text-orange-700", icon: <ShieldAlert className="w-4 h-4" /> },
  warning:  { label: "Warning (≤90d)",  color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700",  icon: <AlertTriangle className="w-4 h-4" /> },
  safe:     { label: "Safe (>90d)",     color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", icon: <ShieldCheck className="w-4 h-4" /> },
};

// ── Main page ──────────────────────────────────────────────────
export default function ExpiryManagementPage() {
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ExpiryZone | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("daysLeft");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [disposing, setDisposing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const addToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  // ── Fetch all batches ─────────────────────────────────────────
  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/batches");
      const json = await res.json();
      if (json.success) {
        setBatches(json.data);
      }
    } catch {
      addToast("Failed to load batches", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // ── Enriched batch data ───────────────────────────────────────
  const enrichedBatches = useMemo(() => {
    return batches.map((b) => {
      const days = daysUntilExpiry(b.expirationDate);
      return {
        ...b,
        daysLeft: days,
        zone: getExpiryZone(days),
        stockValue: b.quantity * b.purchasePrice,
        medName: b.medicineId?.name ?? "Unknown",
      };
    });
  }, [batches]);

  // ── Zone counts ───────────────────────────────────────────────
  const zoneCounts = useMemo(() => {
    const counts = { expired: 0, critical: 0, warning: 0, safe: 0, totalAtRisk: 0, atRiskValue: 0 };
    for (const b of enrichedBatches) {
      counts[b.zone]++;
      if (b.zone === "expired" || b.zone === "critical") {
        counts.totalAtRisk++;
        counts.atRiskValue += b.stockValue;
      }
    }
    return counts;
  }, [enrichedBatches]);

  // ── Filtered + sorted ─────────────────────────────────────────
  const filteredBatches = useMemo(() => {
    let result = enrichedBatches;

    // Zone filter
    if (zoneFilter !== "all") {
      result = result.filter((b) => b.zone === zoneFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.medName.toLowerCase().includes(q) ||
          b.batchNumber.toLowerCase().includes(q) ||
          (b.medicineId?.genericName ?? "").toLowerCase().includes(q) ||
          (b.medicineId?.category ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "daysLeft": cmp = a.daysLeft - b.daysLeft; break;
        case "name": cmp = a.medName.localeCompare(b.medName); break;
        case "quantity": cmp = a.quantity - b.quantity; break;
        case "expirationDate": cmp = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(); break;
        case "value": cmp = a.stockValue - b.stockValue; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [enrichedBatches, zoneFilter, search, sortKey, sortDir]);

  // ── Dispose expired batch (set qty to 0) ──────────────────────
  const disposeBatch = async (batchId: string) => {
    setDisposing(batchId);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 0 }),
      });
      const json = await res.json();
      if (json.success) {
        addToast("Batch disposed — stock set to 0", "success");
        fetchBatches();
      } else {
        addToast(json.message ?? "Failed to dispose batch", "error");
      }
    } catch {
      addToast("Network error while disposing batch", "error");
    } finally {
      setDisposing(null);
    }
  };

  // ── Sort toggle ───────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#188FA7]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#188FA7]" />;
  };

  // ── Days-left visual ──────────────────────────────────────────
  const DaysLeftBadge = ({ days, zone }: { days: number; zone: ExpiryZone }) => {
    const cfg = ZONE_CONFIG[zone];
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.badge}`}>
        {cfg.icon}
        {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
      </div>
    );
  };

  // ── Progress bar for days until expiry ────────────────────────
  const ExpiryBar = ({ days }: { days: number }) => {
    const max = 365;
    const pct = Math.max(0, Math.min(100, (days / max) * 100));
    let barColor = "bg-emerald-400";
    if (days <= 0) barColor = "bg-red-500";
    else if (days <= 30) barColor = "bg-orange-500";
    else if (days <= 90) barColor = "bg-yellow-400";
    return (
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    );
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Expiry Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor batch expiration dates, identify at-risk stock, and dispose expired inventory.
          </p>
        </div>
        <button onClick={() => { setLoading(true); fetchBatches(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <RotateCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Zone stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Expired */}
        <button onClick={() => setZoneFilter(zoneFilter === "expired" ? "all" : "expired")}
          className={`relative p-4 rounded-2xl border text-left transition-all ${zoneFilter === "expired" ? "ring-2 ring-red-400 " : ""}bg-red-50 border-red-200 hover:shadow-md`}>
          <div className="flex items-center gap-2 mb-2">
            <Ban className="w-5 h-5 text-red-600" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Expired</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{loading ? "—" : zoneCounts.expired}</p>
          <p className="text-xs text-red-500 mt-1">batches</p>
        </button>

        {/* Critical */}
        <button onClick={() => setZoneFilter(zoneFilter === "critical" ? "all" : "critical")}
          className={`relative p-4 rounded-2xl border text-left transition-all ${zoneFilter === "critical" ? "ring-2 ring-orange-400 " : ""}bg-orange-50 border-orange-200 hover:shadow-md`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Critical</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{loading ? "—" : zoneCounts.critical}</p>
          <p className="text-xs text-orange-500 mt-1">≤ 30 days</p>
        </button>

        {/* Warning */}
        <button onClick={() => setZoneFilter(zoneFilter === "warning" ? "all" : "warning")}
          className={`relative p-4 rounded-2xl border text-left transition-all ${zoneFilter === "warning" ? "ring-2 ring-yellow-400 " : ""}bg-yellow-50 border-yellow-200 hover:shadow-md`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">Warning</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{loading ? "—" : zoneCounts.warning}</p>
          <p className="text-xs text-yellow-500 mt-1">≤ 90 days</p>
        </button>

        {/* Safe */}
        <button onClick={() => setZoneFilter(zoneFilter === "safe" ? "all" : "safe")}
          className={`relative p-4 rounded-2xl border text-left transition-all ${zoneFilter === "safe" ? "ring-2 ring-emerald-400 " : ""}bg-emerald-50 border-emerald-200 hover:shadow-md`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Safe</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{loading ? "—" : zoneCounts.safe}</p>
          <p className="text-xs text-emerald-500 mt-1">&gt; 90 days</p>
        </button>

        {/* At-risk value */}
        <div className="p-4 rounded-2xl border bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{loading ? "—" : formatINR(zoneCounts.atRiskValue)}</p>
          <p className="text-xs text-purple-500 mt-1">{zoneCounts.totalAtRisk} batches value</p>
        </div>
      </div>

      {/* ── Search + filters ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medicine name, batch number, or category…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]"
            />
          </div>

          {/* Zone filter dropdown */}
          <div className="relative">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-w-[160px]">
              <Filter className="w-4 h-4" />
              {zoneFilter === "all" ? "All Zones" : ZONE_CONFIG[zoneFilter].label}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden min-w-[180px]">
                  <button onClick={() => { setZoneFilter("all"); setShowFilterDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 ${zoneFilter === "all" ? "bg-gray-50 font-bold" : ""}`}>
                    <Package className="w-4 h-4 text-gray-400" /> All Zones
                  </button>
                  {(["expired", "critical", "warning", "safe"] as ExpiryZone[]).map((z) => {
                    const cfg = ZONE_CONFIG[z];
                    return (
                      <button key={z} onClick={() => { setZoneFilter(z); setShowFilterDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 ${zoneFilter === z ? "bg-gray-50 font-bold" : ""} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                        <span className="ml-auto text-xs font-bold">{zoneCounts[z]}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Clear filters */}
          {(search || zoneFilter !== "all") && (
            <button onClick={() => { setSearch(""); setZoneFilter("all"); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Batch table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm">Loading expiry data…</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <CalendarDays className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-base font-semibold text-gray-500">No batches found</p>
            <p className="text-sm mt-1">
              {search || zoneFilter !== "all"
                ? "Try adjusting your filters"
                : "Add inventory batches to start tracking expiry dates"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1.5">Medicine <SortIcon col="name" /></span>
                  </th>
                  <th className="px-5 py-4 font-semibold">Batch</th>
                  <th className="px-5 py-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort("quantity")}>
                    <span className="flex items-center gap-1.5">Stock <SortIcon col="quantity" /></span>
                  </th>
                  <th className="px-5 py-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort("expirationDate")}>
                    <span className="flex items-center gap-1.5">Expiry Date <SortIcon col="expirationDate" /></span>
                  </th>
                  <th className="px-5 py-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort("daysLeft")}>
                    <span className="flex items-center gap-1.5">Days Left <SortIcon col="daysLeft" /></span>
                  </th>
                  <th className="px-5 py-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort("value")}>
                    <span className="flex items-center gap-1.5">Value <SortIcon col="value" /></span>
                  </th>
                  <th className="px-5 py-4 font-semibold">Expiry</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBatches.map((b) => {
                  const cfg = ZONE_CONFIG[b.zone];
                  return (
                    <tr key={b._id}
                      className={`transition-colors ${b.zone === "expired" ? "bg-red-50/40" : b.zone === "critical" ? "bg-orange-50/30" : "hover:bg-gray-50/50"}`}>

                      {/* Zone badge */}
                      <td className="px-5 py-4">
                        <DaysLeftBadge days={b.daysLeft} zone={b.zone} />
                      </td>

                      {/* Medicine */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                            <Pill className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{b.medName}</p>
                            {b.medicineId?.category && (
                              <p className="text-xs text-gray-400">{b.medicineId.category}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Batch number */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                          {b.batchNumber}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-5 py-4">
                        <span className={`font-bold ${b.quantity === 0 ? "text-gray-300" : "text-gray-800"}`}>
                          {b.quantity}
                        </span>
                      </td>

                      {/* Expiration date */}
                      <td className="px-5 py-4 text-gray-600">{formatDate(b.expirationDate)}</td>

                      {/* Days left */}
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${cfg.color}`}>
                          {b.daysLeft <= 0 ? `${Math.abs(b.daysLeft)}d overdue` : `${b.daysLeft} days`}
                        </span>
                      </td>

                      {/* Stock value */}
                      <td className="px-5 py-4 text-gray-600">{formatINR(b.stockValue)}</td>

                      {/* Visual bar */}
                      <td className="px-5 py-4 min-w-[100px]">
                        <ExpiryBar days={b.daysLeft} />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        {b.zone === "expired" && b.quantity > 0 ? (
                          <button
                            onClick={() => disposeBatch(b._id)}
                            disabled={disposing === b._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {disposing === b._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Dispose
                          </button>
                        ) : b.quantity === 0 ? (
                          <span className="text-xs text-gray-400 font-medium">Depleted</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
              <span>
                {filteredBatches.length} batch{filteredBatches.length !== 1 ? "es" : ""}
                {zoneFilter !== "all" && ` in ${ZONE_CONFIG[zoneFilter].label}`}
              </span>
              <span>
                Total value: <strong className="text-gray-700">{formatINR(filteredBatches.reduce((s, b) => s + b.stockValue, 0))}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#188FA7]" /> Expiry Zone Guide
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["expired", "critical", "warning", "safe"] as ExpiryZone[]).map((z) => {
            const cfg = ZONE_CONFIG[z];
            return (
              <div key={z} className={`flex items-center gap-2.5 p-3 rounded-xl ${cfg.bg} ${cfg.border} border`}>
                <div className={cfg.color}>{cfg.icon}</div>
                <div>
                  <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-[11px] text-gray-500">
                    {z === "expired" && "Past expiry date"}
                    {z === "critical" && "Expires within 30 days"}
                    {z === "warning" && "Expires within 90 days"}
                    {z === "safe" && "More than 90 days left"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
