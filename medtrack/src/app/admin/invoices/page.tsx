"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  FileText,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Pill,
  Printer,
  Download,
  X,
  Eye,
  Hash,
  IndianRupee,
  Clock,
  ChevronDown,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShoppingCart,
  Receipt,
  Building2,
  Phone,
  Mail,
  MapPin,
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

interface SaleRecord {
  _id: string;
  medicineId: { _id: string; name: string; category?: string; genericName?: string } | null;
  batchId: { _id: string; batchNumber: string } | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
}

interface InvoiceItem {
  medicine: Medicine;
  batches: BatchInfo[];
  availableStock: number;
  unitPrice: number;
  quantity: number;
}

interface SavedInvoice {
  id: string;
  number: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: {
    name: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

type Tab = "create" | "history";

interface Toast { id: number; message: string; type: "success" | "error"; }

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
function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${y}${m}${d}-${rand}`;
}

// ── Main page ──────────────────────────────────────────────────
export default function InvoicePage() {
  const [tab, setTab] = useState<Tab>("create");

  // Create invoice state
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batchMap, setBatchMap] = useState<Record<string, BatchInfo[]>>({});
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [showMedList, setShowMedList] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [invoiceNumber] = useState(generateInvoiceNumber);

  // Preview state
  const [previewInvoice, setPreviewInvoice] = useState<SavedInvoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // History state
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  // ── Load medicines + batches ──────────────────────────────────
  useEffect(() => {
    fetch("/api/medicines?status=active")
      .then((r) => r.json())
      .then(async (j) => {
        if (!j.success) return;
        setMedicines(j.data);

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
        for (const mid in map) {
          map[mid].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
        }
        setBatchMap(map);
      });
  }, [processing]);

  // Load saved invoices from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("medtrack_invoices");
    if (saved) setSavedInvoices(JSON.parse(saved));
  }, []);

  const saveInvoices = (invoices: SavedInvoice[]) => {
    setSavedInvoices(invoices);
    localStorage.setItem("medtrack_invoices", JSON.stringify(invoices));
  };

  // ── Cart operations ───────────────────────────────────────────
  const filteredMeds = medicines.filter((m) => {
    const q = medSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.genericName ?? "").toLowerCase().includes(q);
  });

  const addToItems = (med: Medicine) => {
    const batches = batchMap[med._id] ?? [];
    const totalStock = batches.reduce((s, b) => s + b.quantity, 0);
    if (totalStock === 0) { addToast(`${med.name} is out of stock`, "error"); return; }
    if (items.find((c) => c.medicine._id === med._id)) { addToast(`${med.name} already added`, "error"); return; }
    const unitPrice = batches[0]?.sellingPrice ?? 0;
    setItems((prev) => [...prev, { medicine: med, batches, availableStock: totalStock, unitPrice, quantity: 1 }]);
    setMedSearch("");
    setShowMedList(false);
  };

  const updateQty = (id: string, delta: number) => {
    setItems((prev) => prev.map((item) => {
      if (item.medicine._id !== id) return item;
      return { ...item, quantity: Math.max(1, Math.min(item.availableStock, item.quantity + delta)) };
    }));
  };

  const setQty = (id: string, val: string) => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    setItems((prev) => prev.map((item) => {
      if (item.medicine._id !== id) return item;
      return { ...item, quantity: Math.max(1, Math.min(item.availableStock, n)) };
    }));
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((c) => c.medicine._id !== id));

  const subtotal = items.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // ── Generate invoice ──────────────────────────────────────────
  const generateInvoice = async () => {
    if (items.length === 0) return;
    setProcessing(true);

    const invoiceItems: SavedInvoice["items"] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medicineId: item.medicine._id, quantity: item.quantity }),
        });
        const json = await res.json();
        if (json.success) {
          for (const sale of json.data) {
            invoiceItems.push({
              name: sale.medicineId?.name ?? item.medicine.name,
              batchNumber: sale.batchId?.batchNumber ?? "—",
              quantity: sale.quantity,
              unitPrice: sale.unitPrice,
              totalPrice: sale.totalPrice,
            });
          }
        } else {
          errors.push(`${item.medicine.name}: ${json.message}`);
        }
      } catch {
        errors.push(`${item.medicine.name}: Request failed`);
      }
    }

    if (errors.length > 0) addToast(errors[0], "error");

    if (invoiceItems.length > 0) {
      const invoice: SavedInvoice = {
        id: Date.now().toString(),
        number: invoiceNumber,
        date: new Date().toISOString(),
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || "—",
        items: invoiceItems,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal,
      };

      const updated = [invoice, ...savedInvoices];
      saveInvoices(updated);
      setPreviewInvoice(invoice);
      setShowPreview(true);
      setItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setTaxRate(0);
      addToast("Invoice generated successfully!", "success");
    }
    setProcessing(false);
  };

  // ── Print invoice ─────────────────────────────────────────────
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; border-bottom: 2px solid #188FA7; padding-bottom: 16px; margin-bottom: 16px; }
        .header h1 { color: #188FA7; font-size: 22px; letter-spacing: 1px; }
        .header p { color: #666; font-size: 11px; margin-top: 4px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .info-block { }
        .info-block p { margin: 2px 0; }
        .info-block .label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-block .value { font-size: 13px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #ddd; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        .text-right { text-align: right; }
        .totals { margin-left: auto; width: 260px; }
        .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .totals .row.grand { border-top: 2px solid #188FA7; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: 700; color: #188FA7; }
        .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // ── History filtering ─────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    if (!historySearch.trim()) return savedInvoices;
    const q = historySearch.toLowerCase();
    return savedInvoices.filter(
      (inv) =>
        inv.number.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q)
    );
  }, [savedInvoices, historySearch]);

  const deleteInvoice = (id: string) => {
    const updated = savedInvoices.filter((inv) => inv.id !== id);
    saveInvoices(updated);
    addToast("Invoice deleted", "success");
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Generate, preview, and print professional invoices.</p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setTab("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === "create" ? "bg-white text-[#188FA7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Plus className="w-4 h-4" /> Create
          </button>
          <button onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === "history" ? "bg-white text-[#188FA7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <FileText className="w-4 h-4" /> History
            {savedInvoices.length > 0 && (
              <span className="bg-[#188FA7] text-white text-xs px-1.5 py-0.5 rounded-full font-bold leading-none">
                {savedInvoices.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── CREATE TAB ───────────────────────────────────────────── */}
      {tab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Customer + Medicine items */}
          <div className="lg:col-span-2 space-y-4">

            {/* Invoice info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-[#188FA7]" />
                <h2 className="text-base font-bold text-gray-800">Invoice Details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Invoice Number</label>
                  <div className="px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-[#188FA7]">
                    {invoiceNumber}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1.5">Customer Name</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1.5">Phone Number</label>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                </div>
              </div>
            </div>

            {/* Medicine search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">Add Medicine</h2>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={medSearch}
                  onChange={(e) => { setMedSearch(e.target.value); setShowMedList(true); }}
                  onFocus={() => setShowMedList(true)}
                  placeholder="Search medicine by name or generic name..."
                  className="w-full pl-10 pr-4 py-3 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 focus:border-[#188FA7] shadow-2xs" />
                {showMedList && medSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto">
                    {filteredMeds.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
                        <Pill className="w-4 h-4" /> No medicines found
                      </div>
                    ) : filteredMeds.map((med) => {
                      const stock = (batchMap[med._id] ?? []).reduce((s, b) => s + b.quantity, 0);
                      const inList = items.some((c) => c.medicine._id === med._id);
                      return (
                        <button key={med._id} disabled={stock === 0 || inList}
                          onClick={() => addToItems(med)}
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
                            {inList && <p className="text-xs text-blue-500">Added</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {showMedList && <div className="fixed inset-0 z-20" onClick={() => setShowMedList(false)} />}
            </div>

            {/* Invoice items table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">
                  Items {items.length > 0 && <span className="ml-1 text-sm text-gray-400">({items.length})</span>}
                </h2>
                {items.length > 0 && (
                  <button onClick={() => setItems([])} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ShoppingCart className="w-14 h-14 mb-3 opacity-20" />
                  <p className="text-sm font-medium text-gray-500">No items added</p>
                  <p className="text-xs mt-1">Search and add medicines above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-gray-50/70 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 font-semibold">#</th>
                        <th className="px-5 py-3 font-semibold">Medicine</th>
                        <th className="px-5 py-3 font-semibold">Price</th>
                        <th className="px-5 py-3 font-semibold">Qty</th>
                        <th className="px-5 py-3 font-semibold text-right">Total</th>
                        <th className="px-5 py-3 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, i) => (
                        <tr key={item.medicine._id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-gray-900">{item.medicine.name}</p>
                            <p className="text-xs text-gray-400">{item.medicine.category} · Stock: {item.availableStock}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{formatINR(item.unitPrice)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => updateQty(item.medicine._id, -1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input type="number" min={1} max={item.availableStock} value={item.quantity}
                                onChange={(e) => setQty(item.medicine._id, e.target.value)}
                                className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30" />
                              <button onClick={() => updateQty(item.medicine._id, 1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-gray-900">{formatINR(item.unitPrice * item.quantity)}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => removeItem(item.medicine._id)} className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary + actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h2 className="text-base font-bold text-gray-800 mb-4">Invoice Summary</h2>

              <div className="space-y-3 pb-4 border-b border-gray-100">
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No items added</p>
                ) : items.map((item) => (
                  <div key={item.medicine._id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate max-w-[160px]">
                      {item.medicine.name} <span className="text-gray-400">×{item.quantity}</span>
                    </span>
                    <span className="font-medium text-gray-800 shrink-0">{formatINR(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatINR(subtotal)}</span>
                </div>

                {/* Discount input */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">Discount (%)</span>
                  <input type="number" min={0} max={100} value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-20 text-right text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 shadow-2xs" />
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-medium">- Discount</span>
                    <span className="font-bold text-red-600">-{formatINR(discountAmount)}</span>
                  </div>
                )}

                {/* Tax input */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">Tax / GST (%)</span>
                  <input type="number" min={0} max={100} value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-20 text-right text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#188FA7]/40 shadow-2xs" />
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">+ Tax</span>
                    <span className="font-medium">{formatINR(taxAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-100 mb-5">
                <span className="font-bold text-gray-900 text-base">Grand Total</span>
                <span className="text-xl font-bold text-[#188FA7]">{formatINR(grandTotal)}</span>
              </div>

              <button onClick={generateInvoice} disabled={items.length === 0 || processing}
                className="w-full py-3.5 rounded-xl bg-[#188FA7] hover:bg-[#137a8f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                {processing ? "Generating…" : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl border bg-blue-50 border-blue-100">
              <Receipt className="w-5 h-5 text-blue-700" />
              <div>
                <div className="text-lg font-bold text-blue-700 leading-tight">{savedInvoices.length}</div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">Total Invoices</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl border bg-emerald-50 border-emerald-100">
              <IndianRupee className="w-5 h-5 text-emerald-700" />
              <div>
                <div className="text-lg font-bold text-emerald-700 leading-tight">
                  {formatINR(savedInvoices.reduce((s, inv) => s + inv.total, 0))}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">Total Revenue</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl border bg-purple-50 border-purple-100">
              <IndianRupee className="w-5 h-5 text-purple-700" />
              <div>
                <div className="text-lg font-bold text-purple-700 leading-tight">
                  {savedInvoices.length > 0
                    ? formatINR(savedInvoices.reduce((s, inv) => s + inv.total, 0) / savedInvoices.length)
                    : "₹0.00"}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">Avg Invoice</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by invoice number, customer name, or phone…"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#188FA7]/30 focus:border-[#188FA7]" />
            </div>
          </div>

          {/* Invoice list */}
          <div className="space-y-3">
            {filteredInvoices.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 text-gray-400">
                <FileText className="w-14 h-14 mb-4 opacity-20" />
                <p className="text-base font-semibold text-gray-500">No invoices found</p>
                <p className="text-sm mt-1">
                  {historySearch ? "Try adjusting your search" : "Generate an invoice from the Create tab"}
                </p>
              </div>
            ) : filteredInvoices.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 font-mono">{inv.number}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <CalendarDays className="w-3 h-3" /> {formatDate(inv.date)}
                          <Clock className="w-3 h-3 ml-1" /> {formatTime(inv.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#188FA7]">{formatINR(inv.total)}</p>
                      <p className="text-xs text-gray-400">{inv.items.length} item{inv.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {inv.customerName}</span>
                    {inv.customerPhone !== "—" && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {inv.customerPhone}</span>
                    )}
                    {inv.discount > 0 && (
                      <span className="text-red-500 font-medium">Discount: -{formatINR(inv.discount)}</span>
                    )}
                    {inv.tax > 0 && (
                      <span className="text-gray-500 font-medium">Tax: +{formatINR(inv.tax)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center border-t border-gray-100 divide-x divide-gray-100">
                  <button onClick={() => { setPreviewInvoice(inv); setShowPreview(true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#188FA7] hover:bg-[#188FA7]/5 transition-colors">
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button onClick={() => { setPreviewInvoice(inv); setShowPreview(true); setTimeout(handlePrint, 300); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => deleteInvoice(inv.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invoice Preview Modal ───────────────────────────────── */}
      {showPreview && previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#188FA7]" /> Invoice Preview
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#188FA7] text-white text-sm font-bold hover:bg-[#137a8f] transition-colors">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setShowPreview(false)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Printable invoice content */}
            <div ref={printRef} className="p-8">

              {/* Store header */}
              <div className="text-center border-b-2 border-[#188FA7] pb-5 mb-6">
                <h1 className="text-2xl font-bold text-[#188FA7] tracking-wide">MedTrack Pharmacy</h1>
                <p className="text-xs text-gray-500 mt-1">Pharmacy Inventory Management System</p>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> 123 Health Street</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +91 98765 43210</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> info@medtrack.com</span>
                </div>
              </div>

              {/* Invoice info */}
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Bill To</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{previewInvoice.customerName}</p>
                  {previewInvoice.customerPhone !== "—" && (
                    <p className="text-xs text-gray-500">{previewInvoice.customerPhone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Invoice</p>
                  <p className="text-sm font-bold text-[#188FA7] font-mono mt-1">{previewInvoice.number}</p>
                  <p className="text-xs text-gray-500">{formatDate(previewInvoice.date)}</p>
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase font-semibold tracking-wider border-b-2 border-gray-200">#</th>
                    <th className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase font-semibold tracking-wider border-b-2 border-gray-200">Medicine</th>
                    <th className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase font-semibold tracking-wider border-b-2 border-gray-200">Batch</th>
                    <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 uppercase font-semibold tracking-wider border-b-2 border-gray-200">Qty</th>
                    <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 uppercase font-semibold tracking-wider border-b-2 border-gray-200">Unit Price</th>
                    <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 uppercase font-semibold tracking-wider border-b-2 border-gray-200">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900">{item.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.batchNumber}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-gray-800">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{formatINR(item.unitPrice)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatINR(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatINR(previewInvoice.subtotal)}</span>
                  </div>
                  {previewInvoice.discount > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-red-500">Discount</span>
                      <span className="font-medium text-red-500">-{formatINR(previewInvoice.discount)}</span>
                    </div>
                  )}
                  {previewInvoice.tax > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Tax / GST</span>
                      <span className="font-medium">+{formatINR(previewInvoice.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t-2 border-[#188FA7] mt-2">
                    <span className="font-bold text-gray-900 text-base">Grand Total</span>
                    <span className="font-bold text-[#188FA7] text-lg">{formatINR(previewInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-8 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Thank you for your purchase!</p>
                <p className="text-[10px] text-gray-300 mt-1">Generated by MedTrack Pharmacy Management System</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
