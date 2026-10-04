"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Package,
  Pill,
  Calendar,
  IndianRupee,
  Layers,
  Copy,
  Check,
  Eye,
  RotateCw,
  Contrast,
  SlidersHorizontal,
  Plus,
  Trash2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Zap,
} from "lucide-react";
import Tesseract from "tesseract.js";

interface MedicineItem {
  _id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  status: string;
}

interface ParsedOCRData {
  medicineName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  mfgDate: string;
  mrp: string;
  costPrice: string;
  quantity: string;
  manufacturer: string;
  category: string;
  rawText: string;
  confidence: {
    name: "high" | "medium" | "low" | "none";
    batch: "high" | "medium" | "low" | "none";
    expiry: "high" | "medium" | "low" | "none";
    mrp: "high" | "medium" | "low" | "none";
  };
}

const COMMON_DRUGS = [
  { name: "Paracetamol 650mg", generic: "Paracetamol", category: "Painkillers", manufacturer: "Micro Labs" },
  { name: "Dolo 650", generic: "Paracetamol", category: "Painkillers", manufacturer: "Micro Labs" },
  { name: "Augmentin 625 Duo", generic: "Amoxicillin and Clavulanate Potassium", category: "Antibiotics", manufacturer: "GSK" },
  { name: "Azithral 500", generic: "Azithromycin", category: "Antibiotics", manufacturer: "Alembic" },
  { name: "Pantocid 40", generic: "Pantoprazole", category: "Gastrointestinal", manufacturer: "Sun Pharma" },
  { name: "Pan 40", generic: "Pantoprazole", category: "Gastrointestinal", manufacturer: "Alkem" },
  { name: "Glycomet 500 SR", generic: "Metformin Hydrochloride", category: "Diabetes", manufacturer: "USV" },
  { name: "Cetcip 10", generic: "Cetirizine Hydrochloride", category: "Respiratory", manufacturer: "Cipla" },
  { name: "Montair LC", generic: "Montelukast + Levocetirizine", category: "Respiratory", manufacturer: "Cipla" },
  { name: "Telma 40", generic: "Telmisartan", category: "Cardiac", manufacturer: "Glenmark" },
  { name: "Atorva 10", generic: "Atorvastatin", category: "Cardiac", manufacturer: "Zydus Cadila" },
  { name: "Becosules Z", generic: "Vitamin B-Complex with Zinc", category: "Vitamins", manufacturer: "Pfizer" },
  { name: "Shelcal 500", generic: "Calcium and Vitamin D3", category: "Vitamins", manufacturer: "Torrent Pharma" },
];

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

const SAMPLE_PRESETS = [
  {
    title: "Dolo 650 Strip",
    desc: "Paracetamol 650mg Tablet Strip with Batch, EXP & MRP",
    badge: "Painkiller",
    name: "DOLO 650",
    generic: "Paracetamol Tablets IP 650 mg",
    batch: "DL2491A",
    expiry: "2027-08-31",
    mfg: "2024-09-01",
    mrp: "33.50",
    cost: "24.00",
    qty: "150",
    manufacturer: "Micro Labs Limited",
    category: "Painkillers",
    text: `DOLO-650
Paracetamol Tablets IP 650 mg
Each uncoated tablet contains:
Paracetamol IP 650 mg
B.No. DL2491A
MFD. 09/2024
EXP. 08/2027
M.R.P. Rs. 33.50
Incl. of all taxes (Per strip of 15 tabs)
Mfg. by: Micro Labs Limited, Solan (H.P.)`,
  },
  {
    title: "Augmentin 625 Duo",
    desc: "Amoxicillin & Clavulanate Potassium Tablets Carton",
    badge: "Antibiotic",
    name: "AUGMENTIN 625 DUO",
    generic: "Amoxicillin and Potassium Clavulanate Tablets IP",
    batch: "AG8832T",
    expiry: "2026-12-31",
    mfg: "2024-11-01",
    mrp: "215.00",
    cost: "165.00",
    qty: "60",
    manufacturer: "GlaxoSmithKline Pharmaceuticals Ltd",
    category: "Antibiotics",
    text: `AUGMENTIN 625 DUO
Amoxicillin and Potassium Clavulanate Tablets IP
Each film coated tablet contains:
Amoxicillin Trihydrate IP eq. to Amoxicillin 500 mg
Dilute Potassium Clavulanate IP eq. to Clavulanic Acid 125 mg
Batch No: AG8832T
Mfg Date: 11/2024
Exp Date: 12/2026
M.R.P. Rs. 215.00 (10 Tablets)
Manufactured in India by:
GlaxoSmithKline Pharmaceuticals Ltd`,
  },
  {
    title: "Pantocid 40 Box",
    desc: "Pantoprazole Gastro-resistant Tablets IP",
    badge: "Gastro",
    name: "PANTOCID 40",
    generic: "Pantoprazole Gastro-resistant Tablets IP 40mg",
    batch: "PT7740K",
    expiry: "2027-05-31",
    mfg: "2025-01-01",
    mrp: "164.20",
    cost: "115.00",
    qty: "100",
    manufacturer: "Sun Pharmaceutical Ind. Ltd.",
    category: "Gastrointestinal",
    text: `PANTOCID 40
Pantoprazole Gastro-resistant Tablets IP
Each gastro-resistant tablet contains:
Pantoprazole Sodium IP eq. to Pantoprazole 40 mg
B.No. PT7740K
MFG. JAN 2025
EXP. MAY 2027
M.R.P. Rs. 164.20 / Strip of 15 Tabs
SUN PHARMACEUTICAL IND. LTD.
Survey No. 214, Plot No. 20, Silvassa`,
  },
];

export default function OCREntryPage() {
  // State
  const [existingMedicines, setExistingMedicines] = useState<MedicineItem[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(true);

  // Upload & Image processing
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [contrastBoost, setContrastBoost] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [rotation, setRotation] = useState(0);

  // OCR state
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState("");
  const [rawOcrText, setRawOcrText] = useState("");

  // Extracted and form data
  const [entryMode, setEntryMode] = useState<"existing" | "new">("existing");
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  
  // Medicine fields (for new medicine)
  const [medicineName, setMedicineName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("Painkillers");
  const [manufacturer, setManufacturer] = useState("");
  const [description, setDescription] = useState("");
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);

  // Batch fields
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState("100");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");

  // Confidence indicators
  const [confidence, setConfidence] = useState<{
    name: "high" | "medium" | "low" | "none";
    batch: "high" | "medium" | "low" | "none";
    expiry: "high" | "medium" | "low" | "none";
    mrp: "high" | "medium" | "low" | "none";
  }>({
    name: "none",
    batch: "none",
    expiry: "none",
    mrp: "none",
  });

  // UI / Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recentEntries, setRecentEntries] = useState<Array<{
    id: string;
    medicineName: string;
    batchNumber: string;
    qty: number;
    expiry: string;
    sellingPrice: number;
    time: string;
  }>>([]);
  const [activeTab, setActiveTab] = useState<"form" | "raw">("form");
  const [copiedRaw, setCopiedRaw] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch medicines on mount
  const fetchMedicines = useCallback(async () => {
    try {
      setLoadingMedicines(true);
      const res = await fetch("/api/medicines");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setExistingMedicines(data.data);
      }
    } catch (err) {
      console.error("Error fetching medicines:", err);
    } finally {
      setLoadingMedicines(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  // Load sample preset directly
  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    // Generate a visual canvas image representation of the medicine packaging
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 360);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#f1f5f9");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 360);

      // Border
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#00A1BA";
      ctx.strokeRect(10, 10, 580, 340);

      // Top colored strip
      ctx.fillStyle = "#0B2136";
      ctx.fillRect(10, 10, 580, 48);

      // Header text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("PHARMACEUTICAL PACKAGING SAMPLE", 30, 42);

      // Medicine title
      ctx.fillStyle = "#00A1BA";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(preset.name, 35, 100);

      // Generic
      ctx.fillStyle = "#334155";
      ctx.font = "italic 16px sans-serif";
      ctx.fillText(preset.generic, 35, 130);

      // Divider line
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(35, 150);
      ctx.lineTo(565, 150);
      ctx.stroke();

      // Info rows
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`B.No.     : ${preset.batch}`, 35, 185);
      ctx.fillText(`MFG. DATE : ${preset.mfg}`, 35, 215);
      ctx.fillText(`EXP. DATE : ${preset.expiry}`, 35, 245);
      ctx.fillText(`M.R.P.    : Rs. ${preset.mrp} (INCL. ALL TAXES)`, 35, 275);

      // Footer
      ctx.fillStyle = "#64748b";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Mfg by: ${preset.manufacturer}`, 35, 320);

      const dataUrl = canvas.toDataURL("image/png");
      setImageSrc(dataUrl);
    }

    setRawOcrText(preset.text);

    // Apply values
    setMedicineName(preset.name);
    setGenericName(preset.generic);
    setCategory(preset.category);
    setManufacturer(preset.manufacturer);
    setBatchNumber(preset.batch);
    setExpiryDate(preset.expiry);
    setSellingPrice(preset.mrp);
    setPurchasePrice(preset.cost);
    setQuantity(preset.qty);

    setConfidence({
      name: "high",
      batch: "high",
      expiry: "high",
      mrp: "high",
    });

    // Check if this medicine already exists in DB
    const match = existingMedicines.find(
      (m) =>
        m.name.toLowerCase().includes(preset.name.toLowerCase()) ||
        preset.name.toLowerCase().includes(m.name.toLowerCase())
    );

    if (match) {
      setEntryMode("existing");
      setSelectedMedicineId(match._id);
    } else {
      setEntryMode("new");
      setSelectedMedicineId("");
    }

    setFeedback({
      type: "success",
      message: `Loaded sample '${preset.title}' with realistic batch and expiry details!`,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Smart text parsing algorithm
  const parseExtractedText = (text: string): ParsedOCRData => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    
    // 1. Batch Number detection
    // Matches patterns like "B.No.", "BATCH NO", "Lot No", "B.N.", "LOT", "BATCH:"
    let detectedBatch = "";
    let batchConf: "high" | "medium" | "low" | "none" = "none";
    const batchRegex = /(?:B\.?\s*No\.?|Batch\s*(?:No\.?)?|Lot\s*(?:No\.?)?|LOT|B\/N)\s*[:#\-.\s]?\s*([A-Za-z0-9\-]+)/i;
    
    for (const line of lines) {
      const match = line.match(batchRegex);
      if (match && match[1] && match[1].length >= 3) {
        detectedBatch = match[1].toUpperCase();
        batchConf = "high";
        break;
      }
    }
    // Fallback: look for standalone alphanumeric code resembling batch (e.g., "DL2491A", "AB1029")
    if (!detectedBatch) {
      const fallbackBatch = text.match(/\b([A-Z]{1,3}[0-9]{3,6}[A-Z0-9]?)\b/);
      if (fallbackBatch) {
        detectedBatch = fallbackBatch[1];
        batchConf = "medium";
      }
    }

    // 2. Expiry Date detection
    // Matches "EXP", "EXPIRY", "USE BEFORE", "EXP. DATE"
    let detectedExpiry = "";
    let expiryConf: "high" | "medium" | "low" | "none" = "none";
    const expiryRegex = /(?:EXP\.?\s*(?:DATE)?|EXPIRY|USE\s*BEFORE|VAL\s*THRU)\s*[:#\-.\s]?\s*([0-9]{1,2}[\/\.\-][0-9]{2,4}|[A-Za-z]{3}[\/\.\-\s]+[0-9]{2,4})/i;

    for (const line of lines) {
      const match = line.match(expiryRegex);
      if (match && match[1]) {
        const rawDate = match[1].trim();
        const normalized = normalizeDate(rawDate);
        if (normalized) {
          detectedExpiry = normalized;
          expiryConf = "high";
          break;
        }
      }
    }

    // Fallback date search
    if (!detectedExpiry) {
      const genericDateRegex = /\b(0[1-9]|1[0-2])[\/\.\-](20[2-3][0-9]|[2-3][0-9])\b/;
      const match = text.match(genericDateRegex);
      if (match) {
        const norm = normalizeDate(match[0]);
        if (norm) {
          detectedExpiry = norm;
          expiryConf = "medium";
        }
      }
    }

    // 3. Mfg Date detection
    let detectedMfg = "";
    const mfgRegex = /(?:MFG\.?\s*(?:DATE)?|MFD\.?|M\/D)\s*[:#\-.\s]?\s*([0-9]{1,2}[\/\.\-][0-9]{2,4}|[A-Za-z]{3}[\/\.\-\s]+[0-9]{2,4})/i;
    for (const line of lines) {
      const match = line.match(mfgRegex);
      if (match && match[1]) {
        const norm = normalizeDate(match[1].trim());
        if (norm) detectedMfg = norm;
        break;
      }
    }

    // 4. MRP / Price detection
    let detectedMrp = "";
    let mrpConf: "high" | "medium" | "low" | "none" = "none";
    const mrpRegex = /(?:M\.?R\.?P\.?|MRP\s*Rs\.?|Price|Rs\.?|₹)\s*[:#\-.\s]?\s*([0-9]+(?:\.[0-9]{1,2})?)/i;
    for (const line of lines) {
      const match = line.match(mrpRegex);
      if (match && match[1]) {
        detectedMrp = match[1];
        mrpConf = "high";
        break;
      }
    }

    // 5. Medicine Name & Generic matching
    let detectedName = "";
    let detectedGeneric = "";
    let detectedCategory = "Painkillers";
    let detectedManufacturer = "";
    let nameConf: "high" | "medium" | "low" | "none" = "none";

    // First check against known drug catalog
    for (const drug of COMMON_DRUGS) {
      if (text.toLowerCase().includes(drug.name.toLowerCase()) || text.toLowerCase().includes(drug.generic.toLowerCase())) {
        detectedName = drug.name;
        detectedGeneric = drug.generic;
        detectedCategory = drug.category;
        detectedManufacturer = drug.manufacturer;
        nameConf = "high";
        break;
      }
    }

    // Check existing medicines in database
    if (!detectedName && existingMedicines.length > 0) {
      for (const med of existingMedicines) {
        if (text.toLowerCase().includes(med.name.toLowerCase())) {
          detectedName = med.name;
          detectedGeneric = med.genericName || "";
          detectedCategory = med.category;
          detectedManufacturer = med.manufacturer || "";
          nameConf = "high";
          break;
        }
      }
    }

    // If still not found, take the most prominent line (usually first line with uppercase words)
    if (!detectedName && lines.length > 0) {
      for (const line of lines.slice(0, 3)) {
        if (line.length >= 3 && !line.match(/^(b\.?no|mfg|exp|mrp|rs|batch)/i)) {
          detectedName = line.replace(/[^A-Za-z0-9\s\-]/g, "").trim();
          nameConf = "medium";
          break;
        }
      }
    }

    // Calculate approximate cost price (typically 70% of MRP)
    let calculatedCost = "0";
    if (detectedMrp && !isNaN(parseFloat(detectedMrp))) {
      calculatedCost = (parseFloat(detectedMrp) * 0.72).toFixed(2);
    }

    // Default quantity
    let detectedQty = "100";
    const qtyMatch = text.match(/([0-9]{1,3})\s*(?:Tabs?|Tablets?|Caps?|Capsules?)/i);
    if (qtyMatch && qtyMatch[1]) {
      detectedQty = (parseInt(qtyMatch[1], 10) * 10).toString(); // e.g. 10 strips of 10
    }

    return {
      medicineName: detectedName,
      genericName: detectedGeneric,
      batchNumber: detectedBatch,
      expiryDate: detectedExpiry,
      mfgDate: detectedMfg,
      mrp: detectedMrp || "50.00",
      costPrice: calculatedCost,
      quantity: detectedQty,
      manufacturer: detectedManufacturer,
      category: detectedCategory,
      rawText: text,
      confidence: {
        name: nameConf,
        batch: batchConf,
        expiry: expiryConf,
        mrp: mrpConf,
      },
    };
  };

  // Helper to convert diverse date formats into standard YYYY-MM-DD
  const normalizeDate = (dateStr: string): string => {
    try {
      const clean = dateStr.replace(/[^0-9A-Za-z\/\.\-]/g, "").trim();
      const months: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      };

      // Check text month e.g. "MAY 2027" or "May/27"
      for (const [mName, mNum] of Object.entries(months)) {
        if (clean.toLowerCase().includes(mName)) {
          const yearMatch = clean.match(/20[2-3][0-9]|[2-3][0-9]/);
          if (yearMatch) {
            let yr = yearMatch[0];
            if (yr.length === 2) yr = "20" + yr;
            // Last day of that month
            return `${yr}-${mNum}-28`;
          }
        }
      }

      // Format: MM/YY or MM/YYYY
      const parts = clean.split(/[\/\.\-]/);
      if (parts.length >= 2) {
        let m = parseInt(parts[0], 10);
        let y = parseInt(parts[1], 10);

        // If flipped e.g. YYYY/MM
        if (m > 1900 || m > 31) {
          const temp = m;
          m = y;
          y = temp;
        }

        if (m >= 1 && m <= 12) {
          let yrStr = y.toString();
          if (yrStr.length === 2) yrStr = "20" + yrStr;
          const mmStr = m < 10 ? `0${m}` : `${m}`;
          return `${yrStr}-${mmStr}-28`;
        }
      }
    } catch {
      // ignore
    }
    return "";
  };

  // Run Tesseract OCR on selected image
  const processImageOCR = async (imageSource: string) => {
    setIsProcessing(true);
    setOcrProgress(5);
    setOcrStatusText("Initializing AI OCR Engine (Tesseract.js)...");
    setFeedback(null);

    try {
      const worker = await Tesseract.createWorker("eng");
      setOcrProgress(30);
      setOcrStatusText("Analyzing packaging textures & recognizing characters...");

      const ret = await worker.recognize(imageSource);
      await worker.terminate();

      setOcrProgress(90);
      setOcrStatusText("Parsing medicine patterns & structured attributes...");

      const extracted = ret.data.text;
      setRawOcrText(extracted);

      if (!extracted || extracted.trim().length === 0) {
        throw new Error("No readable text detected in the image. Please try a clearer image with good lighting.");
      }

      const parsed = parseExtractedText(extracted);

      // Auto-fill form fields
      if (parsed.medicineName) setMedicineName(parsed.medicineName);
      if (parsed.genericName) setGenericName(parsed.genericName);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.manufacturer) setManufacturer(parsed.manufacturer);
      if (parsed.batchNumber) setBatchNumber(parsed.batchNumber);
      if (parsed.expiryDate) setExpiryDate(parsed.expiryDate);
      if (parsed.mrp) setSellingPrice(parsed.mrp);
      if (parsed.costPrice) setPurchasePrice(parsed.costPrice);
      if (parsed.quantity) setQuantity(parsed.quantity);

      setConfidence(parsed.confidence);

      // Match against existing medicines
      const matched = existingMedicines.find(
        (m) =>
          m.name.toLowerCase().includes(parsed.medicineName.toLowerCase()) ||
          (parsed.medicineName && parsed.medicineName.toLowerCase().includes(m.name.toLowerCase()))
      );

      if (matched) {
        setEntryMode("existing");
        setSelectedMedicineId(matched._id);
        setFeedback({
          type: "success",
          message: `Text extracted successfully! Matched with existing medicine: "${matched.name}".`,
        });
      } else {
        setEntryMode("new");
        setSelectedMedicineId("");
        setFeedback({
          type: "success",
          message: "Text extracted successfully! Configured as a new medicine entry.",
        });
      }

      setOcrProgress(100);
      setOcrStatusText("Complete!");
    } catch (err: unknown) {
      console.error("OCR Error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to run OCR on this image. Please try another photo.";
      setFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Image upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageSrc(result);
        processImageOCR(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop handling
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageSrc(result);
        processImageOCR(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission: save to MedTrack Inventory
  const handleSaveToInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      let finalMedicineId = selectedMedicineId;
      let finalMedName = medicineName;

      // 1. If 'new' mode, first create the medicine in database
      if (entryMode === "new") {
        if (!medicineName.trim()) {
          throw new Error("Medicine name is required.");
        }
        if (!category.trim()) {
          throw new Error("Medicine category is required.");
        }

        const medRes = await fetch("/api/medicines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: medicineName.trim(),
            genericName: genericName.trim() || undefined,
            category: category.trim(),
            manufacturer: manufacturer.trim() || undefined,
            description: description.trim() || undefined,
            prescriptionRequired,
            status: "active",
          }),
        });

        const medData = await medRes.json();
        if (!medRes.ok || !medData.success) {
          throw new Error(medData.message || "Failed to create medicine.");
        }

        finalMedicineId = medData.data._id;
        finalMedName = medData.data.name;

        // Refresh medicines list
        await fetchMedicines();
      } else {
        if (!selectedMedicineId) {
          throw new Error("Please select an existing medicine or switch to 'Create New Medicine'.");
        }
        const found = existingMedicines.find((m) => m._id === selectedMedicineId);
        if (found) finalMedName = found.name;
      }

      // 2. Validate batch details
      if (!batchNumber.trim()) {
        throw new Error("Batch number is required.");
      }
      if (!expiryDate) {
        throw new Error("Expiration date is required.");
      }

      const expiryObj = new Date(expiryDate);
      if (isNaN(expiryObj.getTime()) || expiryObj <= new Date()) {
        throw new Error("Expiration date must be a valid future date.");
      }

      const qtyNum = parseInt(quantity, 10);
      const buyPrice = parseFloat(purchasePrice);
      const sellPrice = parseFloat(sellingPrice);

      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new Error("Quantity must be greater than 0.");
      }
      if (isNaN(buyPrice) || buyPrice < 0) {
        throw new Error("Purchase price cannot be negative.");
      }
      if (isNaN(sellPrice) || sellPrice < 0) {
        throw new Error("Selling price cannot be negative.");
      }

      // 3. Create the batch record
      const batchRes = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: finalMedicineId,
          batchNumber: batchNumber.trim().toUpperCase(),
          quantity: qtyNum,
          purchasePrice: buyPrice,
          sellingPrice: sellPrice,
          expirationDate: expiryObj.toISOString(),
          receivedDate: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
        }),
      });

      const batchData = await batchRes.json();
      if (!batchRes.ok || !batchData.success) {
        throw new Error(batchData.message || "Failed to save batch to inventory.");
      }

      // Record to recent entries
      const newEntry = {
        id: batchData.data?._id || Date.now().toString(),
        medicineName: finalMedName,
        batchNumber: batchNumber.trim().toUpperCase(),
        qty: qtyNum,
        expiry: expiryDate,
        sellingPrice: sellPrice,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setRecentEntries((prev) => [newEntry, ...prev.slice(0, 4)]);

      setFeedback({
        type: "success",
        message: `Batch ${batchNumber.toUpperCase()} for "${finalMedName}" has been successfully added to inventory!`,
      });

      // Clear batch fields for next scan
      setBatchNumber("");
      setQuantity("100");
    } catch (err: unknown) {
      console.error("Save error:", err);
      const msg = err instanceof Error ? err.message : "Failed to save entry.";
      setFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A1BA] to-[#0B2136] flex items-center justify-center text-white shadow-md">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0B2136] tracking-tight">
                OCR Smart Entry
              </h1>
              <p className="text-sm text-gray-500">
                AI Optical Character Recognition for medicine strips, boxes & supplier invoices
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action links */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors shadow-sm"
          >
            <Package className="w-4 h-4 text-gray-500" />
            View Inventory
          </Link>
          <Link
            href="/admin/medicines"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00A1BA] hover:bg-[#188FA7] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Pill className="w-4 h-4" />
            Medicine Catalog
          </Link>
        </div>
      </div>

      {/* Preset Quick Demo Strip */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00A1BA]" />
            <span className="text-sm font-semibold text-[#0B2136]">
              Instant Demo Presets
            </span>
            <span className="text-xs text-gray-400">
              (Click to test OCR parsing without uploading photos)
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-3.5 rounded-xl border border-gray-200 hover:border-[#00A1BA] hover:bg-teal-50/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-[#0B2136] group-hover:text-[#00A1BA] transition-colors">
                    {preset.title}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{preset.desc}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600 border-t border-gray-100 pt-2">
                <span>B.No: <strong className="font-mono text-gray-800">{preset.batch}</strong></span>
                <span className="text-[#00A1BA] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Load & Parse <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout: Left Scanner / Right Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Upload, Camera, Preview & OCR Status (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#0B2136] mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#00A1BA]" />
              Image Ingestion & Preview
            </h2>

            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-[#00A1BA] rounded-xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-teal-50/20 group relative overflow-hidden"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#00A1BA]/10 group-hover:bg-[#00A1BA]/20 flex items-center justify-center text-[#00A1BA] transition-colors">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag & drop packaging image
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, JPEG or WEBP (Medicine strip, box, carton, invoice)
                  </p>
                </div>
              </div>
            </div>

            {/* Image Preview Area */}
            {imageSrc && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Captured Packaging</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                      title="Rotate Image"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContrastBoost((b) => !b)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        contrastBoost
                          ? "bg-[#00A1BA] text-white border-[#00A1BA]"
                          : "border-gray-200 hover:bg-gray-100 text-gray-600"
                      }`}
                      title="Toggle High Contrast for clearer text"
                    >
                      <Contrast className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrayscale((g) => !g)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        grayscale
                          ? "bg-[#00A1BA] text-white border-[#00A1BA]"
                          : "border-gray-200 hover:bg-gray-100 text-gray-600"
                      }`}
                      title="Grayscale binarization"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-slate-900 flex items-center justify-center min-h-[220px] max-h-[340px]">
                  <img
                    src={imageSrc}
                    alt="Packaging Scan"
                    className="max-h-[320px] w-auto object-contain transition-all"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      filter: `${contrastBoost ? "contrast(180%) brightness(95%) " : ""}${
                        grayscale ? "grayscale(100%)" : ""
                      }`,
                    }}
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center">
                      <RefreshCw className="w-8 h-8 text-[#00A1BA] animate-spin mb-3" />
                      <p className="text-sm font-semibold">{ocrStatusText}</p>
                      <div className="w-48 bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className="bg-[#00A1BA] h-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-300 mt-2">{ocrProgress}%</span>
                    </div>
                  )}
                </div>

                {/* Re-run button */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => processImageOCR(imageSrc)}
                    className="flex-1 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                    Re-scan Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageSrc(null);
                      setRawOcrText("");
                    }}
                    className="py-2 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Raw Text Inspector & Extraction Quality */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-[#0B2136]">
                  Extracted Raw OCR Text
                </h3>
              </div>
              {rawOcrText && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(rawOcrText)}
                  className="inline-flex items-center gap-1 text-xs text-[#00A1BA] hover:underline"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedRaw ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            {rawOcrText ? (
              <div className="space-y-3">
                <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded-xl font-mono text-gray-700 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                  {rawOcrText}
                </pre>

                {/* Parsing Confidence Badges */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                    Recognition Quality
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600">Medicine Name</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          confidence.name === "high"
                            ? "bg-emerald-100 text-emerald-700"
                            : confidence.name === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {confidence.name.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600">Batch Number</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          confidence.batch === "high"
                            ? "bg-emerald-100 text-emerald-700"
                            : confidence.batch === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {confidence.batch.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600">Expiry Date</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          confidence.expiry === "high"
                            ? "bg-emerald-100 text-emerald-700"
                            : confidence.expiry === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {confidence.expiry.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600">MRP / Price</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          confidence.mrp === "high"
                            ? "bg-emerald-100 text-emerald-700"
                            : confidence.mrp === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {confidence.mrp.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-1" />
                Upload or select a sample image above to see raw character extraction.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Verification & Inventory Ingestion Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            {/* Form Header & Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#0B2136] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#00A1BA]" />
                  Verify & Commit to Inventory
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirm extracted values and link to your pharmacy catalog
                </p>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryMode("existing")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    entryMode === "existing"
                      ? "bg-white text-[#0B2136] shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Existing Medicine
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("new")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    entryMode === "new"
                      ? "bg-white text-[#0B2136] shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  + New Medicine
                </button>
              </div>
            </div>

            {/* Notifications / Alerts */}
            {feedback && (
              <div
                className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    {feedback.type === "success" ? "Success" : "Validation Error"}
                  </p>
                  <p className="text-xs mt-0.5">{feedback.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveToInventory} className="mt-6 space-y-6">
              {/* SECTION 1: MEDICINE SELECTION / CREATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#00A1BA]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Step 1: Medicine Mapping
                  </span>
                </div>

                {entryMode === "existing" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1.5">
                      Select Existing Medicine in Catalog *
                    </label>
                    <select
                      value={selectedMedicineId}
                      onChange={(e) => setSelectedMedicineId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                      required
                    >
                      <option value="" className="text-gray-500">-- Choose matching medicine --</option>
                      {existingMedicines.map((m) => (
                        <option key={m._id} value={m._id} className="text-gray-900">
                          {m.name} {m.genericName ? `(${m.genericName})` : ""} - {m.category}
                        </option>
                      ))}
                    </select>
                    {loadingMedicines && (
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Loading medicines...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Brand / Medicine Name *
                      </label>
                      <input
                        type="text"
                        value={medicineName}
                        onChange={(e) => setMedicineName(e.target.value)}
                        placeholder="e.g. Paracetamol 650mg, Augmentin 625 Duo"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Generic Name / Composition
                      </label>
                      <input
                        type="text"
                        value={genericName}
                        onChange={(e) => setGenericName(e.target.value)}
                        placeholder="e.g. Paracetamol IP"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                        required
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} className="text-gray-900">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        value={manufacturer}
                        onChange={(e) => setManufacturer(e.target.value)}
                        placeholder="e.g. Cipla, Sun Pharma, Micro Labs"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="rxReq"
                        checked={prescriptionRequired}
                        onChange={(e) => setPrescriptionRequired(e.target.checked)}
                        className="rounded border-gray-300 text-[#00A1BA] focus:ring-[#00A1BA] h-4 w-4"
                      />
                      <label htmlFor="rxReq" className="text-xs font-semibold text-gray-800 cursor-pointer">
                        Prescription Required (Schedule H/X)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: BATCH & EXPIRY ATTRIBUTES */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#00A1BA]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Step 2: Batch & Inventory Details
                    </span>
                  </div>
                  <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-semibold">
                    FEFO Enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Batch Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Batch / Lot Number *
                    </label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. DL2491A, BT-9912"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono font-bold uppercase text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                      required
                    />
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Expiration Date *
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Units / Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                      required
                    />
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Purchase Cost (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-600 text-xs font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Selling Price / MRP */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Selling Price / MRP (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-600 text-xs font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Received Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Received Date
                    </label>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A1BA] bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Batch will be automatically tracked in Expiry Radar and FEFO dispatch order.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-[#00A1BA] hover:bg-[#188FA7] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Inventory...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save & Add to Inventory
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Session Log: Recent OCR Entries */}
          {recentEntries.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00A1BA]" />
                  <h3 className="text-sm font-semibold text-[#0B2136]">
                    Batches Logged in Current Session
                  </h3>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                  {recentEntries.length} logged
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Expiry</th>
                      <th className="py-2.5 px-3">MRP (₹)</th>
                      <th className="py-2.5 px-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {recentEntries.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-gray-900 font-semibold">
                          {item.medicineName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">
                          {item.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">
                          {item.qty} units
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {item.expiry}
                        </td>
                        <td className="py-2.5 px-3 text-gray-900 font-semibold">
                          ₹{item.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-400">
                          {item.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
