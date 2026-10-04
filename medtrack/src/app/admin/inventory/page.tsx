"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Layers,
  Pencil,
  Trash2,
  Loader2,
  X,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Package,
  CalendarDays,
  IndianRupee,
  Hash,
  Pill,
  ArrowUpDown,
  BadgeAlert,
  ShieldCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface MedicineRef {
  _id: string;
  name: string;
  category?: string;
}

interface Batch {
  _id: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expirationDate: string;
  receivedDate: string;
  medicineId: MedicineRef | null;
  createdAt: string;
}

interface Medicine {
  _id: string;
  name: string;
  category?: string;
}

type ExpiryStatus = "Expired" | "Expiring Soon" | "Critical" | "Safe";
type ToastType = "success" | "error";
interface Toast { id: number; message: string; type: ToastType; }

const emptyForm = {
  medicineId: "",
  batchNumber: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
  expirationDate: "",
  receivedDate: "",
};

// ── Helpers ────────────────────────────────────────────────────
function getExpiryStatus(dateStr: string): ExpiryStatus {
  const now = new Date();
  const expiry = new Date(dateStr);
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);
  const d60 = new Date(); d60.setDate(d60.getDate() + 60);
  if (expiry < now) return "Expired";
  if (expiry <= d30) return "Expiring Soon";
  if (expiry <= d60) return "Critical";
  return "Safe";
}

const STATUS_STYLES: Record<ExpiryStatus, string> = {
  Expired: "bg-red-100 text-red-600",
  "Expiring Soon": "bg-orange-100 text-orange-600",
  Critical: "bg-yellow-100 text-yellow-700",
  Safe: "bg-emerald-100 text-emerald-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

// ── Page component ─────────────────────────────────────────────
export default function InventoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  // ── Fetch batches ──────────────────────────────────────────
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (expiryFilter) params.set("expiry", expiryFilter);
      if (stockFilter) params.set("stock", stockFilter);
      const res = await fetch(`/api/batches?${params}`);
      const json = await res.json();
      if (json.success) setBatches(json.data);
    } catch {
      addToast("Failed to load batches", "error");
    } finally {
      setLoading(false);
    }
  }, [search, expiryFilter, stockFilter]);

  useEffect(() => {
    const t = setTimeout(fetchBatches, 300);
    return () => clearTimeout(t);
  }, [fetchBatches]);

  // Fetch medicines for the dropdown
  useEffect(() => {
    fetch("/api/medicines?status=active")
      .then((r) => r.json())
      .then((j) => { if (j.success) setMedicines(j.data); });
  }, []);

  // ── Open add / edit ────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (b: Batch) => {
    setEditTarget(b);
    setForm({
      medicineId: b.medicineId?._id ?? "",
      batchNumber: b.batchNumber,
      quantity: String(b.quantity),
      purchasePrice: String(b.purchasePrice),
      sellingPrice: String(b.sellingPrice),
      expirationDate: b.expirationDate.split("T")[0],
      receivedDate: b.receivedDate ? b.receivedDate.split("T")[0] : "",
    });
    setShowModal(true);
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineId || !form.batchNumber || !form.quantity || !form.purchasePrice || !form.sellingPrice || !form.expirationDate) {
      addToast("All required fields must be filled", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        medicineId: form.medicineId,
        batchNumber: form.batchNumber,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        expirationDate: form.expirationDate,
        receivedDate: form.receivedDate || undefined,
      };
      const url = editTarget ? `/api/batches/${editTarget._id}` : "/api/batches";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        addToast(editTarget ? "Batch updated" : "Batch added successfully", "success");
        setShowModal(false);
        fetchBatches();
      } else {
        addToast(json.message ?? "Something went wrong", "error");
      }
    } catch {
      addToast("Request failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/batches/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        addToast("Batch deleted", "success");
        setDeleteTarget(null);
        fetchBatches();
      } else {
        addToast(json.message ?? "Delete failed", "error");
      }
    } catch {
      addToast("Request failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────
  const totalStock = batches.reduce((s, b) => s + b.quantity, 0);
  const totalValue = batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
  const expiredCount = batches.filter((b) => getExpiryStatus(b.expirationDate) === "Expired").length;
  const expiringSoonCount = batches.filter((b) => ["Expiring Soon", "Critical"].includes(getExpiryStatus(b.expirationDate))).length;

  const today = new Date().toISOString().split("T")[0];
  const minExpiry = new Date();
  minExpiry.setDate(minExpiry.getDate() + 1);
  const minExpiryStr = minExpiry.toISOString().split("T")[0];

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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage stock batches with FEFO tracking — add, edit and monitor expiry.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#188FA7] hover:bg-[#137a8f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Batch
        </button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Batches",   val: batches.length, icon: <Layers className="w-5 h-5" />,     bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100" },
          { label: "Total Stock",     val: `${totalStock.toLocaleString()} units`, icon: <Package className="w-5 h-5" />,   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
          { label: "Stock Value",     val: formatINR(totalValue), icon: <IndianRupee className="w-5 h-5" />, bg: "bg-purple-50", text: "text-purple-700",  border: "border-purple-100" },
          { label: "Expiry Alerts",   val: expiredCount + expiringSoonCount, icon: <BadgeAlert className="w-5 h-5" />,  bg: "bg-red-50",    text: "text-red-600",    border: "border-red-100" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
            <div className={s.text}>{s.icon}</div>
            <div>
              <div className={`text-xl font-bold ${s.text} leading-tight`}>
                {loading ? <span className="inline-block w-10 h-4 bg-current opacity-20 rounded animate-pulse" /> : s.val}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by batch number..."
              className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs"
            />
          </div>

          <div className="relative">
            <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 text-sm font-medium text-gray-900 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs">
              <option value="" className="text-gray-500">All Expiry</option>
              <option value="expired" className="text-gray-900">Expired</option>
              <option value="expiring" className="text-gray-900">Expiring (30 days)</option>
              <option value="valid" className="text-gray-900">Valid</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 text-sm font-medium text-gray-900 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs">
              <option value="" className="text-gray-500">All Stock</option>
              <option value="available" className="text-gray-900">In Stock</option>
              <option value="out" className="text-gray-900">Out of Stock</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {(search || expiryFilter || stockFilter) && (
            <button onClick={() => { setSearch(""); setExpiryFilter(""); setStockFilter(""); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Batch Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm">Loading inventory…</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Layers className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-base font-semibold text-gray-500">No batches found</p>
            <p className="text-sm mt-1">
              {search || expiryFilter || stockFilter
                ? "Try adjusting your filters"
                : "Click \"Add Batch\" to add your first stock batch"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    <div className="flex items-center gap-1">FEFO <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-5 py-4 font-semibold">Medicine</th>
                  <th className="px-5 py-4 font-semibold">Batch No.</th>
                  <th className="px-5 py-4 font-semibold">Qty</th>
                  <th className="px-5 py-4 font-semibold">Purchase Price</th>
                  <th className="px-5 py-4 font-semibold">Selling Price</th>
                  <th className="px-5 py-4 font-semibold">Expiry Date</th>
                  <th className="px-5 py-4 font-semibold">Days Left</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((b, i) => {
                  const status = getExpiryStatus(b.expirationDate);
                  const days = daysUntil(b.expirationDate);
                  return (
                    <tr key={b._id} className="hover:bg-gray-50/50 transition-colors group">
                      {/* FEFO priority badge */}
                      <td className="px-5 py-4">
                        <span className={`w-7 h-7 inline-flex items-center justify-center rounded-lg text-xs font-bold
                          ${status === "Expired" ? "bg-red-50 text-red-500"
                          : status === "Expiring Soon" ? "bg-orange-50 text-orange-600"
                          : status === "Critical" ? "bg-yellow-50 text-yellow-600"
                          : "bg-emerald-50 text-emerald-600"}`}>
                          {i + 1}
                        </span>
                      </td>

                      {/* Medicine */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">
                              {b.medicineId?.name ?? "—"}
                            </p>
                            {b.medicineId?.category && (
                              <p className="text-xs text-gray-400">{b.medicineId.category}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Batch no */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                          {b.batchNumber}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-5 py-4">
                        <span className={`font-bold text-base ${b.quantity === 0 ? "text-red-500" : b.quantity <= 10 ? "text-orange-500" : "text-gray-800"}`}>
                          {b.quantity}
                        </span>
                      </td>

                      {/* Prices */}
                      <td className="px-5 py-4 text-gray-600 font-medium">{formatINR(b.purchasePrice)}</td>
                      <td className="px-5 py-4 text-gray-800 font-semibold">{formatINR(b.sellingPrice)}</td>

                      {/* Expiry */}
                      <td className="px-5 py-4 text-gray-600">{formatDate(b.expirationDate)}</td>

                      {/* Days left */}
                      <td className="px-5 py-4">
                        <span className={`text-sm font-semibold ${days < 0 ? "text-red-500" : days <= 30 ? "text-orange-500" : days <= 60 ? "text-yellow-600" : "text-emerald-600"}`}>
                          {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(b)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(b)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer summary */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
              <span>{batches.length} batch{batches.length !== 1 ? "es" : ""} found</span>
              <span>Total stock value: <strong className="text-gray-700">{formatINR(totalValue)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#188FA7]/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-[#188FA7]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editTarget ? "Edit Batch" : "Add New Batch"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {editTarget ? "Update batch details below" : "Enter batch & stock details"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Medicine select */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Medicine <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Pill className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select required value={form.medicineId} onChange={(e) => setForm({ ...form, medicineId: e.target.value })}
                    className="w-full appearance-none pl-10 pr-9 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs">
                    <option value="" className="text-gray-500">Select medicine</option>
                    {medicines.map((m) => <option key={m._id} value={m._id} className="text-gray-900">{m.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {medicines.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3" /> No active medicines found. Add a medicine first.
                  </p>
                )}
              </div>

              {/* Batch number */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Batch Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input required type="text" value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    placeholder="e.g. BCH-2025-001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input required type="number" min="0" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                </div>
              </div>

              {/* Prices row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Purchase Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input required type="number" min="0" step="0.01" value={form.purchasePrice}
                      onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input required type="number" min="0" step="0.01" value={form.sellingPrice}
                      onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                  </div>
                </div>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input required type="date" min={editTarget ? undefined : minExpiryStr}
                      value={form.expirationDate}
                      onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">Received Date</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="date" max={today} value={form.receivedDate}
                      onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                  </div>
                </div>
              </div>

              {/* Profit margin preview */}
              {form.purchasePrice && form.sellingPrice && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 text-sm">
                  <IndianRupee className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-blue-700">
                    Profit margin:{" "}
                    <strong>
                      {((Number(form.sellingPrice) - Number(form.purchasePrice)) / Number(form.purchasePrice) * 100).toFixed(1)}%
                    </strong>
                    {" "}(₹{(Number(form.sellingPrice) - Number(form.purchasePrice)).toFixed(2)} per unit)
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#188FA7] hover:bg-[#137a8f] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? "Update Batch" : "Add Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ───────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Batch?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Delete batch <span className="font-semibold text-gray-700 font-mono">{deleteTarget.batchNumber}</span>?
              {deleteTarget.quantity > 0 && (
                <span className="block mt-1 text-orange-600 font-medium">
                  ⚠ This batch still has {deleteTarget.quantity} units in stock.
                </span>
              )}
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
