"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  Store,
  ShieldCheck,
  Bell,
  Receipt,
  Database,
  Save,
  CheckCircle2,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Percent,
  Calendar,
  AlertTriangle,
  Users,
  Lock,
  Smartphone,
  QrCode,
  FileText,
  Volume2,
  Check,
  ShieldAlert,
  Server,
  Activity,
  HardDrive,
  Clock,
  Printer,
  ChevronRight,
  Info,
  Building,
  UserCheck,
  KeyRound,
  ExternalLink,
} from "lucide-react";

interface PharmacySettings {
  // Store Profile
  storeName: string;
  tagline: string;
  legalEntity: string;
  drugLicenseNumber: string;
  drugLicense21B: string;
  pharmacistInCharge: string;
  pharmacistRegNo: string;
  gstin: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  currency: string;

  // Inventory & FEFO
  expiryWarningDays: number;
  criticalExpiryDays: number;
  lowStockThreshold: number;
  fefoEnforced: boolean;
  autoQuarantineExpired: boolean;
  allowNegativeStock: boolean;
  enableExpiryDiscount: boolean;
  expiryDiscountPercent: number;

  // Billing & POS
  defaultTaxRate: number;
  taxInclusive: boolean;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptFormat: "thermal_80" | "thermal_58" | "standard_a4";
  showDoctorName: boolean;
  showPharmacistSign: boolean;
  enableUpiQr: boolean;
  upiId: string;
  invoiceFooterNote: string;

  // Alerts
  enableSoundAlerts: boolean;
  dailyExpiryDigest: boolean;
  lowStockInstantAlert: boolean;
  browserNotifications: boolean;

  // Security
  sessionTimeoutMinutes: number;
  enforce2FA: boolean;
  auditLogging: boolean;
}

const DEFAULT_SETTINGS: PharmacySettings = {
  storeName: "MedTrack Central Pharmacy",
  tagline: "Precision Healthcare & FEFO Inventory Dispensing",
  legalEntity: "MedTrack Healthcare Private Limited",
  drugLicenseNumber: "DL-20B/KA-BNG-10492",
  drugLicense21B: "DL-21B/KA-BNG-10493",
  pharmacistInCharge: "Dr. Rajesh Sharma, B.Pharm",
  pharmacistRegNo: "KSPC/REG/48291",
  gstin: "29AABCU9603R1ZM",
  phone: "+91 98765 43210",
  altPhone: "+91 80 2345 6789",
  email: "billing@medtrackpharmacy.com",
  address: "Shop #12, Ground Floor, Apollo Medical Arcade, MG Road",
  city: "Bangalore",
  state: "Karnataka",
  pincode: "560001",
  website: "https://medtrack-pharmacy.local",
  currency: "INR (₹)",

  expiryWarningDays: 90,
  criticalExpiryDays: 30,
  lowStockThreshold: 15,
  fefoEnforced: true,
  autoQuarantineExpired: true,
  allowNegativeStock: false,
  enableExpiryDiscount: true,
  expiryDiscountPercent: 20,

  defaultTaxRate: 12,
  taxInclusive: true,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1042,
  receiptFormat: "standard_a4",
  showDoctorName: true,
  showPharmacistSign: true,
  enableUpiQr: true,
  upiId: "medtrack.pharmacy@okaxis",
  invoiceFooterNote: "Goods once sold can only be returned within 7 days with intact cold-chain & original bill. Get well soon!",

  enableSoundAlerts: true,
  dailyExpiryDigest: true,
  lowStockInstantAlert: true,
  browserNotifications: false,

  sessionTimeoutMinutes: 30,
  enforce2FA: false,
  auditLogging: true,
};

const SAMPLE_STAFF = [
  { id: "1", name: "Dr. Rajesh Sharma", role: "Super Admin & Pharmacist", email: "rajesh@medtrack.com", status: "Active", reg: "KSPC/48291" },
  { id: "2", name: "Anita Deshmukh", role: "Senior Pharmacist", email: "anita.d@medtrack.com", status: "Active", reg: "KSPC/51029" },
  { id: "3", name: "Vikas Patel", role: "Inventory Lead", email: "vikas.p@medtrack.com", status: "Active", reg: "-" },
  { id: "4", name: "Pooja Hegde", role: "POS Cashier", email: "pooja.h@medtrack.com", status: "Active", reg: "-" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"store" | "inventory" | "billing" | "alerts" | "security" | "system">("store");
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [soundTested, setSoundTested] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("medtrack_settings");
      if (stored) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("medtrack_settings", JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Save settings error:", err);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [medRes, batchRes] = await Promise.all([
        fetch("/api/medicines").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/batches").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const backup = {
        app: "MedTrack Pharmacy Management System",
        version: "1.0.0",
        exportTimestamp: new Date().toISOString(),
        settings,
        stats: {
          totalMedicines: medRes.data?.length || 0,
          totalBatches: batchRes.data?.length || 0,
        },
        data: {
          medicines: medRes.data || [],
          batches: batchRes.data || [],
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MedTrack_Backup_${new Date().toISOString().split("T")[0]}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
            localStorage.setItem("medtrack_settings", JSON.stringify(parsed.settings));
            setImportStatus("Configuration imported successfully!");
          } else {
            setImportStatus("Valid backup file loaded.");
          }
          setTimeout(() => setImportStatus(null), 4000);
        } catch {
          setImportStatus("Error: Invalid JSON file format.");
          setTimeout(() => setImportStatus(null), 4000);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTestSound = () => {
    setSoundTested(true);
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.log("AudioContext fallback:", e);
    }
    setTimeout(() => setSoundTested(false), 1200);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all settings to MedTrack default configurations?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem("medtrack_settings");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A1BA] to-[#0B2136] flex items-center justify-center text-white shadow-md">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0B2136] tracking-tight">
              Settings & Store Preferences
            </h1>
            <p className="text-sm text-gray-500">
              Configure pharmacy profile, FEFO rules, tax calculations, invoice templates & data exports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings saved!
            </div>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium transition-colors"
          >
            Reset Defaults
          </button>
          <button
            form="settingsForm"
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A1BA] hover:bg-[#188FA7] text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-xs flex overflow-x-auto gap-1">
        {[
          { id: "store", label: "Store Profile", icon: Store, desc: "License & Location" },
          { id: "inventory", label: "FEFO & Expiry", icon: Calendar, desc: "Stock Automation" },
          { id: "billing", label: "Billing & Invoices", icon: Receipt, desc: "GST & Receipts" },
          { id: "alerts", label: "Alerts & Audio", icon: Bell, desc: "Notifications" },
          { id: "security", label: "Staff & Roles", icon: Users, desc: "Permissions & 2FA" },
          { id: "system", label: "Backup & System", icon: Database, desc: "Diagnostics & Export" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#0B2136] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#00A1BA]" : "text-gray-400"}`} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div className={`text-[10px] font-normal ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form content */}
      <form id="settingsForm" onSubmit={handleSave} className="space-y-6">
        {/* ========================================================
            TAB 1: STORE & PHARMACY PROFILE
           ======================================================== */}
        {activeTab === "store" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Regulatory & License Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                <ShieldCheck className="w-5 h-5 text-[#00A1BA]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B2136]">
                    Drug License & Statutory Credentials
                  </h2>
                  <p className="text-xs text-gray-500">
                    Required for pharmaceutical compliance and official tax invoice generation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Drug License 20B (Allopathic) *
                  </label>
                  <input
                    type="text"
                    value={settings.drugLicenseNumber}
                    onChange={(e) => setSettings({ ...settings, drugLicenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono font-medium"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Retail Drug License (Form 20B)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Drug License 21B (Specified Schedule C/C1)
                  </label>
                  <input
                    type="text"
                    value={settings.drugLicense21B}
                    onChange={(e) => setSettings({ ...settings, drugLicense21B: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Biological & Special Products License</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    GSTIN / Tax Identification *
                  </label>
                  <input
                    type="text"
                    value={settings.gstin}
                    onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono uppercase font-medium"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">15-digit GST Registration Number</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Registered Pharmacist-in-Charge *
                  </label>
                  <input
                    type="text"
                    value={settings.pharmacistInCharge}
                    onChange={(e) => setSettings({ ...settings, pharmacistInCharge: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-medium"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Printed on prescription sales receipts</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pharmacy Council Reg. No. *
                  </label>
                  <input
                    type="text"
                    value={settings.pharmacistRegNo}
                    onChange={(e) => setSettings({ ...settings, pharmacistRegNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">State Pharmacy Council License ID</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Legal Entity / Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.legalEntity}
                    onChange={(e) => setSettings({ ...settings, legalEntity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Corporate or Partnership registration</p>
                </div>
              </div>
            </div>

            {/* General Pharmacy Details Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                <Building className="w-5 h-5 text-[#00A1BA]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B2136]">
                    Storefront & Contact Coordinates
                  </h2>
                  <p className="text-xs text-gray-500">
                    Public facing details appearing on patient invoices and customer support
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pharmacy Trade Name *
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-bold text-[#0B2136]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none bg-white font-medium"
                  >
                    <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                    <option value="GBP (£)">GBP (£) - British Pound</option>
                    <option value="AED (د.إ)">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Primary Phone *
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Emergency / Hotline Phone
                  </label>
                  <input
                    type="text"
                    value={settings.altPhone}
                    onChange={(e) => setSettings({ ...settings, altPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Billing & Orders Email *
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Premises Street Address *
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State / Province *
                  </label>
                  <input
                    type="text"
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Postal / PIN Code *
                  </label>
                  <input
                    type="text"
                    value={settings.pincode}
                    onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: INVENTORY & FEFO RULES
           ======================================================== */}
        {activeTab === "inventory" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                <Calendar className="w-5 h-5 text-[#00A1BA]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B2136]">
                    Expiry Zone Thresholds & Radar Settings
                  </h2>
                  <p className="text-xs text-gray-500">
                    Controls color coding, early warnings, and automated clearance recommendations
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Yellow Warning Zone */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-amber-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      Warning Zone (Yellow)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                      Standard
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mb-4 leading-relaxed">
                    Batches expiring within this window trigger yellow alert badges on inventory and reports.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="30"
                      max="180"
                      value={settings.expiryWarningDays}
                      onChange={(e) =>
                        setSettings({ ...settings, expiryWarningDays: parseInt(e.target.value, 10) || 90 })
                      }
                      className="w-24 px-3 py-2 rounded-xl border border-amber-300 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-amber-900">Days from today</span>
                  </div>
                </div>

                {/* Red Critical Zone */}
                <div className="bg-red-50/70 border border-red-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-red-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse" />
                      Critical Zone (Red)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                      High Priority
                    </span>
                  </div>
                  <p className="text-xs text-red-800 mb-4 leading-relaxed">
                    Urgent risk window. Batches are pushed to the top of POS FEFO queue or marked for vendor return.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="7"
                      max="60"
                      value={settings.criticalExpiryDays}
                      onChange={(e) =>
                        setSettings({ ...settings, criticalExpiryDays: parseInt(e.target.value, 10) || 30 })
                      }
                      className="w-24 px-3 py-2 rounded-xl border border-red-300 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-xs font-semibold text-red-900">Days from today</span>
                  </div>
                </div>

                {/* Low Stock Alert */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      Low Stock Threshold
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">
                      Reorder
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 mb-4 leading-relaxed">
                    When total available quantity across all batches drops below this number, re-order badge triggers.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.lowStockThreshold}
                      onChange={(e) =>
                        setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value, 10) || 15 })
                      }
                      className="w-24 px-3 py-2 rounded-xl border border-blue-300 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-blue-900">Units remaining</span>
                  </div>
                </div>
              </div>

              {/* Policy Toggles */}
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.fefoEnforced}
                    onChange={(e) => setSettings({ ...settings, fefoEnforced: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Strict FEFO (First-Expired, First-Out) Enforcement
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Forces the POS and sales billing system to dispense the earliest expiring batch before any newer batches.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.autoQuarantineExpired}
                    onChange={(e) =>
                      setSettings({ ...settings, autoQuarantineExpired: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Automatic Quarantine for Expired Batches
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Instantly locks and prevents any expired medicine from being billed, dispensed, or transferred to counter.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.allowNegativeStock}
                    onChange={(e) =>
                      setSettings({ ...settings, allowNegativeStock: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Allow Negative Stock / Backorder Dispensing
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Allows billing medicine when physically received but not yet logged in the system (Not recommended).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableExpiryDiscount}
                    onChange={(e) =>
                      setSettings({ ...settings, enableExpiryDiscount: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Enable Near-Expiry Clearance Discount Suggestion
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Suggests a {settings.expiryDiscountPercent}% clearance discount at POS for batches in the Critical Zone.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: BILLING & INVOICING
           ======================================================== */}
        {activeTab === "billing" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                <Receipt className="w-5 h-5 text-[#00A1BA]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B2136]">
                    Tax Configurations & Invoice Format
                  </h2>
                  <p className="text-xs text-gray-500">
                    Set up default GST slabs, bill serial numbering, and thermal printer layouts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Default GST / Tax Slab (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={settings.defaultTaxRate}
                      onChange={(e) =>
                        setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Pharma standard: 5% (essentials) or 12%</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">e.g. INV-, MED-, PHARM-</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Next Invoice Serial #
                  </label>
                  <input
                    type="number"
                    value={settings.nextInvoiceNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, nextInvoiceNumber: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Auto-increments with each finalized bill</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Printer & Paper Format
                  </label>
                  <select
                    value={settings.receiptFormat}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        receiptFormat: e.target.value as "standard_a4" | "thermal_80" | "thermal_58",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none bg-white font-medium"
                  >
                    <option value="standard_a4">Standard A4 / Letter Detailed Invoice</option>
                    <option value="thermal_80">Thermal POS Slip (80mm / 3 inch)</option>
                    <option value="thermal_58">Thermal Small Slip (58mm / 2 inch)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Store UPI ID for Instant QR Billing
                  </label>
                  <input
                    type="text"
                    value={settings.upiId}
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    placeholder="e.g. pharmacy@upi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Generates dynamic payment QR on receipts</p>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="taxIncl"
                    checked={settings.taxInclusive}
                    onChange={(e) => setSettings({ ...settings, taxInclusive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA]"
                  />
                  <label htmlFor="taxIncl" className="text-xs font-medium text-gray-700 cursor-pointer">
                    Prices are inclusive of GST by default
                  </label>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Invoice Footer Disclaimer & Return Policy
                  </label>
                  <textarea
                    rows={2}
                    value={settings.invoiceFooterNote}
                    onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: ALERTS & AUDIO NOTIFICATIONS
           ======================================================== */}
        {activeTab === "alerts" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[#00A1BA]" />
                  <div>
                    <h2 className="text-base font-bold text-[#0B2136]">
                      Notifications & Audio Signals
                    </h2>
                    <p className="text-xs text-gray-500">
                      Configure real-time alerts for expiry breaches, out of stock, and checkout beeps
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestSound}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 text-[#00A1BA] hover:bg-teal-100 text-xs font-semibold transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  {soundTested ? "Playing Sound..." : "Test Chime"}
                </button>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableSoundAlerts}
                    onChange={(e) =>
                      setSettings({ ...settings, enableSoundAlerts: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Enable Sound Audio Feedback
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Plays high-fidelity chimes on barcode scanning, sale finalization, and warning toasts.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.dailyExpiryDigest}
                    onChange={(e) =>
                      setSettings({ ...settings, dailyExpiryDigest: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Daily Morning Expiry Radar Digest
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Automatically surfaces at-risk batches on the dashboard overview every morning at 08:00 AM.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.lowStockInstantAlert}
                    onChange={(e) =>
                      setSettings({ ...settings, lowStockInstantAlert: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Instant Re-order Alert on POS Checkout
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Warns the cashier immediately if a dispensed item drops total store stock below {settings.lowStockThreshold} units.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.browserNotifications}
                    onChange={(e) =>
                      setSettings({ ...settings, browserNotifications: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Native Desktop Push Notifications
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Send browser push alerts when new invoices are completed or batches pass expiry date.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: SECURITY & STAFF
           ======================================================== */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Staff list */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#00A1BA]" />
                  <div>
                    <h2 className="text-base font-bold text-[#0B2136]">
                      Authorized Staff & Pharmacists
                    </h2>
                    <p className="text-xs text-gray-500">
                      Manage registered dispensary operators and role-based access permissions
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert("Staff invitation dialog: Enter pharmacist email & license registration number.")}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00A1BA] hover:bg-[#188FA7] text-white text-xs font-semibold transition-colors"
                >
                  + Add Staff Member
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Staff Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Pharmacy Reg. No.</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {SAMPLE_STAFF.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-3 text-gray-900 font-bold flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[#0B2136] font-semibold text-xs">
                            {staff.name[0]}
                          </div>
                          {staff.name}
                        </td>
                        <td className="py-3 px-3 text-gray-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-mono">
                          {staff.email}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600">
                          {staff.reg}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {staff.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Security Options */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                <Lock className="w-5 h-5 text-[#00A1BA]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B2136]">
                    Security Policies & Session Timeout
                  </h2>
                  <p className="text-xs text-gray-500">
                    Maintain strict compliance for patient prescription confidentiality
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Automatic Terminal Inactivity Timeout
                  </label>
                  <select
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#00A1BA] focus:outline-none bg-white font-medium"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes (Recommended)</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                    <option value={0}>Never lock automatically</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enforce2FA}
                      onChange={(e) => setSettings({ ...settings, enforce2FA: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA]"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Enforce Two-Factor Authentication (2FA) for Admins
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auditLogging}
                      onChange={(e) => setSettings({ ...settings, auditLogging: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A1BA] focus:ring-[#00A1BA]"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Maintain Immutable Audit Trail for Batch Stock Adjustments
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: SYSTEM & BACKUP
           ======================================================== */}
        {activeTab === "system" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Backup & Restore */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#00A1BA]" />
                  <div>
                    <h2 className="text-base font-bold text-[#0B2136]">
                      Database Backup & Restoration
                    </h2>
                    <p className="text-xs text-gray-500">
                      Export complete pharmacy catalog, batches, and configuration files
                    </p>
                  </div>
                </div>
              </div>

              {importStatus && (
                <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                  {importStatus}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0B2136] mb-1">
                      <Download className="w-4 h-4 text-[#00A1BA]" />
                      Export Complete System Backup
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      Generates a timestamped JSON file containing medicine catalogs, active batch inventory, expiry dates, and pharmacy settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportData}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00A1BA] hover:bg-[#188FA7] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? "Compiling JSON..." : "Download JSON Backup"}
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0B2136] mb-1">
                      <Upload className="w-4 h-4 text-gray-600" />
                      Restore from JSON Backup
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      Upload a previously exported MedTrack JSON snapshot to restore configurations and preferences.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Select Backup File (.json)
                  </button>
                </div>
              </div>
            </div>

            {/* System Health Diagnostics */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                <Activity className="w-5 h-5 text-[#00A1BA]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B2136]">
                    System Environment Diagnostics
                  </h2>
                  <p className="text-xs text-gray-500">
                    Live runtime metrics and environment connectivity
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Server className="w-3.5 h-3.5 text-[#00A1BA]" />
                    Engine
                  </div>
                  <div className="font-bold text-sm text-gray-900">Next.js 16</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">● App Router Active</div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Database className="w-3.5 h-3.5 text-[#00A1BA]" />
                    Database
                  </div>
                  <div className="font-bold text-sm text-gray-900">MongoDB</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">● Connected (Mongoose)</div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-[#00A1BA]" />
                    App Version
                  </div>
                  <div className="font-bold text-sm text-gray-900">v1.0.0-PRO</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">FEFO & POS Suite</div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#00A1BA]" />
                    Server Time
                  </div>
                  <div className="font-bold text-sm text-gray-900">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">IST (UTC+05:30)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
