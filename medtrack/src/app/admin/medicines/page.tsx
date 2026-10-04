"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pill,
  Pencil,
  Trash2,
  Loader2,
  X,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Tag,
  Building2,
  FileText,
  FlaskConical,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Medicine {
  _id: string;
  name: string;
  genericName?: string;
  description?: string;
  category: string;
  manufacturer?: string;
  prescriptionRequired: boolean;
  status: "active" | "inactive";
  createdAt: string;
}

const CATEGORIES = [
  "Painkillers",
  "Antibiotics",
  "Vitamins",
  "Diabetes",
  "Cardiac",
  "Antifungal",
  "Antivirals",
  "Gastrointestinal",
  "Respiratory",
  "Dermatology",
  "Others",
];

const CATEGORY_COLORS: Record<string, string> = {
  Painkillers: "bg-blue-100 text-blue-700",
  Antibiotics: "bg-emerald-100 text-emerald-700",
  Vitamins: "bg-purple-100 text-purple-700",
  Diabetes: "bg-orange-100 text-orange-700",
  Cardiac: "bg-red-100 text-red-700",
  Antifungal: "bg-yellow-100 text-yellow-700",
  Antivirals: "bg-pink-100 text-pink-700",
  Gastrointestinal: "bg-cyan-100 text-cyan-700",
  Respiratory: "bg-sky-100 text-sky-700",
  Dermatology: "bg-rose-100 text-rose-700",
  Others: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  name: "",
  genericName: "",
  description: "",
  category: "",
  manufacturer: "",
  prescriptionRequired: false,
  status: "active" as "active" | "inactive",
};

type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Toast helpers ──────────────────────────────────────────
  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // ── Fetch medicines ────────────────────────────────────────
  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/medicines?${params}`);
      const json = await res.json();
      if (json.success) setMedicines(json.data);
    } catch {
      addToast("Failed to load medicines", "error");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchMedicines, 300);
    return () => clearTimeout(t);
  }, [fetchMedicines]);

  // ── Open add / edit modal ──────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (med: Medicine) => {
    setEditTarget(med);
    setForm({
      name: med.name,
      genericName: med.genericName ?? "",
      description: med.description ?? "",
      category: med.category,
      manufacturer: med.manufacturer ?? "",
      prescriptionRequired: med.prescriptionRequired,
      status: med.status,
    });
    setShowModal(true);
  };

  // ── Submit add / edit ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category) {
      addToast("Name and category are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const url = editTarget
        ? `/api/medicines/${editTarget._id}`
        : "/api/medicines";
      const method = editTarget ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        addToast(
          editTarget ? "Medicine updated successfully" : "Medicine added successfully",
          "success"
        );
        setShowModal(false);
        fetchMedicines();
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
      const res = await fetch(`/api/medicines/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        addToast("Medicine deleted successfully", "success");
        setDeleteTarget(null);
        fetchMedicines();
      } else {
        addToast(json.message ?? "Delete failed", "error");
      }
    } catch {
      addToast("Request failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Quick status toggle ────────────────────────────────────
  const toggleStatus = async (med: Medicine) => {
    try {
      const newStatus = med.status === "active" ? "inactive" : "active";
      const res = await fetch(`/api/medicines/${med._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMedicines();
        addToast(`Medicine marked as ${newStatus}`, "success");
      }
    } catch {
      addToast("Failed to update status", "error");
    }
  };

  const active = medicines.filter((m) => m.status === "active").length;
  const inactive = medicines.filter((m) => m.status === "inactive").length;
  const rxRequired = medicines.filter((m) => m.prescriptionRequired).length;

  return (
    <div className="space-y-6">
      {/* Toast container */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto transition-all
              ${t.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
          >
            {t.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Medicines</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your medicine catalogue — add, edit, or deactivate medicines.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#188FA7] hover:bg-[#137a8f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Medicine
        </button>
      </div>

      {/* Summary stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Medicines", val: medicines.length, icon: <Pill className="w-5 h-5" />, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
          { label: "Active", val: active, icon: <CheckCircle className="w-5 h-5" />, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
          { label: "Inactive", val: inactive, icon: <ToggleLeft className="w-5 h-5" />, bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
          { label: "Rx Required", val: rxRequired, icon: <ShieldCheck className="w-5 h-5" />, bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
            <div className={`${s.text}`}>{s.icon}</div>
            <div>
              <div className={`text-2xl font-bold ${s.text}`}>
                {loading ? <span className="inline-block w-6 h-5 bg-current opacity-20 rounded animate-pulse" /> : s.val}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or generic name..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7] text-gray-600"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7] text-gray-600"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {(search || categoryFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(""); setCategoryFilter(""); setStatusFilter(""); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm">Loading medicines…</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Pill className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-base font-semibold text-gray-500">No medicines found</p>
            <p className="text-sm mt-1">
              {search || categoryFilter || statusFilter
                ? "Try adjusting your filters"
                : "Click \"Add Medicine\" to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-4 font-semibold">#</th>
                  <th className="px-6 py-4 font-semibold">Medicine</th>
                  <th className="px-6 py-4 font-semibold">Generic Name</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Manufacturer</th>
                  <th className="px-6 py-4 font-semibold">Rx</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medicines.map((med, i) => (
                  <tr key={med._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          {med.description && (
                            <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{med.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{med.genericName || <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[med.category] ?? CATEGORY_COLORS["Others"]}`}>
                        {med.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{med.manufacturer || <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-4">
                      {med.prescriptionRequired ? (
                        <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(med)}
                        className="flex items-center gap-1.5 group/toggle"
                        title="Click to toggle status"
                      >
                        {med.status === "active" ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(med)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(med)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#188FA7]/10 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-[#188FA7]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editTarget ? "Edit Medicine" : "Add New Medicine"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {editTarget ? "Update the details below" : "Fill in the medicine details"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]"
                  />
                </div>
              </div>

              {/* Generic Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Generic Name</label>
                <div className="relative">
                  <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.genericName}
                    onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                    placeholder="e.g. Acetaminophen"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full appearance-none pl-10 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7] text-gray-700"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Manufacturer */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Manufacturer</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    placeholder="e.g. Sun Pharma"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional short description..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7] resize-none"
                  />
                </div>
              </div>

              {/* Prescription & Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Prescription Required</p>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, prescriptionRequired: !form.prescriptionRequired })}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.prescriptionRequired ? "text-orange-600" : "text-gray-400"}`}
                  >
                    {form.prescriptionRequired ? (
                      <ToggleRight className="w-8 h-5" />
                    ) : (
                      <ToggleLeft className="w-8 h-5" />
                    )}
                    {form.prescriptionRequired ? "Yes" : "No"}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status: form.status === "active" ? "inactive" : "active" })}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.status === "active" ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {form.status === "active" ? (
                      <ToggleRight className="w-8 h-5" />
                    ) : (
                      <ToggleLeft className="w-8 h-5" />
                    )}
                    {form.status === "active" ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#188FA7] hover:bg-[#137a8f] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? "Update Medicine" : "Add Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Medicine?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to delete <span className="font-semibold text-gray-700">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
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
