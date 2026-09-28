"use client";

import { useState, useMemo } from "react";
import {
  Boxes,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  AlertCircle,
  Package,
  Gem,
  ChevronDown,
  ArrowRightLeft,
  History,
  ClipboardList,
  X,
  Check,
  Minus,
  Eye,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Truck,
  ShoppingCart,
  Wrench,
  Hammer,
  ShieldCheck,
  ArrowLeftRight,
  AlertTriangle,
  Flame,
  BarChart3,
} from "lucide-react";
import { recordStockAdjustmentAction } from "@/app/actions/inventory";
import Modal from "@/components/Modal";
import SlideOver from "@/components/SlideOver";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InventoryStatus =
  | "IN_STOCK"
  | "RESERVED"
  | "SOLD"
  | "RETURNED"
  | "EXCHANGED"
  | "IN_REPAIR"
  | "WITH_KARIGAR"
  | "IN_HALLMARKING"
  | "TRANSFERRED"
  | "DAMAGED"
  | "MELTED";

export type TxnType =
  | "PURCHASE_IN"
  | "SALE_OUT"
  | "SALE_RETURN_IN"
  | "PURCHASE_RETURN_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "OPENING_STOCK"
  | "KARIGAR_ISSUE"
  | "KARIGAR_RECEIPT"
  | "HALLMARK_SEND"
  | "HALLMARK_RECEIVE"
  | "MELTING";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  huid: string;
  category: string;
  metal: string;
  purity: string;
  fineness: number;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  quantity: number;
  status: InventoryStatus;
  branch: string;
  purchaseCost: number;
  currentValue: number;
  lastMovement: string;
}

export interface StockMovement {
  id: string;
  date: string;
  time: string;
  type: TxnType;
  sku: string;
  productName: string;
  quantityChange: number;
  weightChange: number;
  reference: string;
  referenceType: string;
  notes: string;
  user: string;
  branch: string;
}

export interface StockAdjustmentRecord {
  id: string;
  date: string;
  sku: string;
  productName: string;
  reason: string;
  qtyBefore: number;
  qtyAfter: number;
  change: number;
  notes: string;
  approvedBy: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INVENTORY_DATA: InventoryItem[] = [
  {
    id: "inv-001", sku: "NK-22K-001", name: "22K Gold Necklace (Classic Lakshmi)",
    barcode: "8901234567001", huid: "HUID-A1B2C3", category: "Necklace", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 18.50, stoneWeight: 0.00,
    netWeight: 18.50, quantity: 4, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 108200, currentValue: 142800, lastMovement: "2 hrs ago",
  },
  {
    id: "inv-002", sku: "RG-18K-001", name: "18K Diamond Solitaire Ring",
    barcode: "8901234567002", huid: "HUID-D4E5F6", category: "Ring", metal: "Gold",
    purity: "18K", fineness: 0.7500, grossWeight: 4.20, stoneWeight: 0.35,
    netWeight: 3.85, quantity: 2, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 62400, currentValue: 87450, lastMovement: "5 hrs ago",
  },
  {
    id: "inv-003", sku: "BG-22K-001", name: "22K Gold Bangles (Pair, Floral)",
    barcode: "8901234567003", huid: "HUID-G7H8I9", category: "Bangle", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 32.80, stoneWeight: 0.00,
    netWeight: 32.80, quantity: 6, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 186000, currentValue: 245600, lastMovement: "1 day ago",
  },
  {
    id: "inv-004", sku: "ER-22K-001", name: "22K Gold Jhumka Earrings",
    barcode: "8901234567004", huid: "HUID-J1K2L3", category: "Earring", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 8.60, stoneWeight: 0.40,
    netWeight: 8.20, quantity: 3, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 48200, currentValue: 68200, lastMovement: "3 hrs ago",
  },
  {
    id: "inv-005", sku: "CH-22K-001", name: "22K Gold Chain (18 inch, Rope)",
    barcode: "8901234567005", huid: "HUID-M4N5O6", category: "Chain", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 9.20, stoneWeight: 0.00,
    netWeight: 9.20, quantity: 2, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 54000, currentValue: 72400, lastMovement: "6 hrs ago",
  },
  {
    id: "inv-006", sku: "PD-22K-001", name: "22K Gold Pendant (Om Design)",
    barcode: "8901234567006", huid: "HUID-P7Q8R9", category: "Pendant", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 5.40, stoneWeight: 0.00,
    netWeight: 5.40, quantity: 8, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 31200, currentValue: 42000, lastMovement: "1 day ago",
  },
  {
    id: "inv-007", sku: "NK-22K-002", name: "22K Gold Temple Necklace Set",
    barcode: "8901234567007", huid: "", category: "Necklace", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 45.80, stoneWeight: 2.10,
    netWeight: 43.70, quantity: 1, status: "WITH_KARIGAR", branch: "Main Branch",
    purchaseCost: 268000, currentValue: 348000, lastMovement: "4 days ago",
  },
  {
    id: "inv-008", sku: "BG-22K-002", name: "22K Gold Kada Bangles (Heavy)",
    barcode: "8901234567008", huid: "HUID-S1T2U3", category: "Bangle", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 52.40, stoneWeight: 0.00,
    netWeight: 52.40, quantity: 1, status: "IN_HALLMARKING", branch: "Main Branch",
    purchaseCost: 312000, currentValue: 412000, lastMovement: "2 days ago",
  },
  {
    id: "inv-009", sku: "RG-22K-001", name: "22K Gold Engagement Ring",
    barcode: "8901234567009", huid: "HUID-V4W5X6", category: "Ring", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 6.80, stoneWeight: 0.00,
    netWeight: 6.80, quantity: 1, status: "RESERVED", branch: "Main Branch",
    purchaseCost: 39800, currentValue: 54000, lastMovement: "1 hr ago",
  },
  {
    id: "inv-010", sku: "CH-AG-001", name: "92.5 Silver Anklet Chain (Pair)",
    barcode: "8901234567010", huid: "", category: "Chain", metal: "Silver",
    purity: "92.5", fineness: 0.9250, grossWeight: 28.60, stoneWeight: 0.00,
    netWeight: 28.60, quantity: 5, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 3200, currentValue: 4800, lastMovement: "3 days ago",
  },
  {
    id: "inv-011", sku: "NK-22K-003", name: "22K Gold Choker (Bridal)",
    barcode: "8901234567011", huid: "HUID-Y7Z8A1", category: "Necklace", metal: "Gold",
    purity: "22K", fineness: 0.9166, grossWeight: 62.30, stoneWeight: 4.50,
    netWeight: 57.80, quantity: 1, status: "IN_REPAIR", branch: "Main Branch",
    purchaseCost: 348000, currentValue: 468000, lastMovement: "5 days ago",
  },
  {
    id: "inv-012", sku: "ER-18K-001", name: "18K Gold Diamond Studs",
    barcode: "8901234567012", huid: "HUID-B2C3D4", category: "Earring", metal: "Gold",
    purity: "18K", fineness: 0.7500, grossWeight: 2.80, stoneWeight: 0.50,
    netWeight: 2.30, quantity: 4, status: "IN_STOCK", branch: "Main Branch",
    purchaseCost: 28400, currentValue: 42000, lastMovement: "12 hrs ago",
  },
];

const MOVEMENTS: StockMovement[] = [
  {
    id: "txn-001", date: "26 Sep 2026", time: "14:22", type: "SALE_OUT",
    sku: "NK-22K-001", productName: "22K Gold Necklace (Classic Lakshmi)",
    quantityChange: -1, weightChange: -18.50, reference: "INV-2026-001",
    referenceType: "SALE", notes: "Sold to Priya Sharma", user: "Admin", branch: "Main Branch",
  },
  {
    id: "txn-002", date: "26 Sep 2026", time: "12:15", type: "PURCHASE_IN",
    sku: "ER-22K-001", productName: "22K Gold Jhumka Earrings",
    quantityChange: +5, weightChange: +43.00, reference: "PUR-2026-042",
    referenceType: "PURCHASE", notes: "Supplier: Kalyan Gold Pvt Ltd", user: "Admin", branch: "Main Branch",
  },
  {
    id: "txn-003", date: "25 Sep 2026", time: "16:45", type: "SALE_RETURN_IN",
    sku: "CH-22K-001", productName: "22K Gold Chain (18 inch, Rope)",
    quantityChange: +1, weightChange: +9.20, reference: "RET-2026-003",
    referenceType: "RETURN", notes: "Customer return — sizing issue", user: "Admin", branch: "Main Branch",
  },
  {
    id: "txn-004", date: "25 Sep 2026", time: "11:30", type: "ADJUSTMENT_OUT",
    sku: "PD-22K-001", productName: "22K Gold Pendant (Om Design)",
    quantityChange: -1, weightChange: -5.40, reference: "ADJ-2026-007",
    referenceType: "ADJUSTMENT", notes: "Damaged during display — sent for melting", user: "Admin", branch: "Main Branch",
  },
  {
    id: "txn-005", date: "24 Sep 2026", time: "10:00", type: "TRANSFER_OUT",
    sku: "BG-22K-001", productName: "22K Gold Bangles (Pair, Floral)",
    quantityChange: -2, weightChange: -65.60, reference: "TRF-2026-001",
    referenceType: "TRANSFER", notes: "Transferred to T. Nagar Branch", user: "Admin", branch: "Main Branch",
  },
  {
    id: "txn-006", date: "24 Sep 2026", time: "09:00", type: "OPENING_STOCK",
    sku: "NK-22K-003", productName: "22K Gold Choker (Bridal)",
    quantityChange: +1, weightChange: +62.30, reference: "OPEN-2026",
    referenceType: "OPENING", notes: "Opening stock entry", user: "System", branch: "Main Branch",
  },
  {
    id: "txn-007", date: "23 Sep 2026", time: "15:30", type: "KARIGAR_ISSUE",
    sku: "NK-22K-002", productName: "22K Gold Temple Necklace Set",
    quantityChange: -1, weightChange: -45.80, reference: "JW-2026-012",
    referenceType: "JOB_WORK", notes: "Issued to Karigar Ramu — stone setting", user: "Admin", branch: "Main Branch",
  },
  {
    id: "txn-008", date: "22 Sep 2026", time: "17:00", type: "HALLMARK_SEND",
    sku: "BG-22K-002", productName: "22K Gold Kada Bangles (Heavy)",
    quantityChange: -1, weightChange: -52.40, reference: "HM-2026-005",
    referenceType: "HALLMARK", notes: "Sent to BIS Hallmarking Centre, Anna Nagar", user: "Admin", branch: "Main Branch",
  },
];

const ADJUSTMENTS: StockAdjustmentRecord[] = [
  {
    id: "adj-001", date: "25 Sep 2026", sku: "PD-22K-001",
    productName: "22K Gold Pendant (Om Design)", reason: "Damaged — display accident",
    qtyBefore: 9, qtyAfter: 8, change: -1, notes: "Pendant clasp broken, sent for melting",
    approvedBy: "Manager (Raj)", status: "APPROVED",
  },
  {
    id: "adj-002", date: "22 Sep 2026", sku: "CH-AG-001",
    productName: "92.5 Silver Anklet Chain (Pair)", reason: "Physical count mismatch",
    qtyBefore: 4, qtyAfter: 5, change: +1, notes: "Found extra pair during audit — likely missed in previous inwarding",
    approvedBy: "Manager (Raj)", status: "APPROVED",
  },
  {
    id: "adj-003", date: "20 Sep 2026", sku: "ER-18K-001",
    productName: "18K Gold Diamond Studs", reason: "Weight discrepancy",
    qtyBefore: 4, qtyAfter: 4, change: 0, notes: "Weight corrected from 2.60g to 2.80g — re-weighed after cleaning",
    approvedBy: "Pending", status: "PENDING",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_CONFIG: Record<InventoryStatus, { label: string; bg: string; color: string; border: string }> = {
  IN_STOCK:       { label: "In Stock",       bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  RESERVED:       { label: "Reserved",       bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  SOLD:           { label: "Sold",           bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  RETURNED:       { label: "Returned",       bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  EXCHANGED:      { label: "Exchanged",      bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  IN_REPAIR:      { label: "In Repair",      bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  WITH_KARIGAR:   { label: "With Karigar",   bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  IN_HALLMARKING: { label: "In Hallmarking", bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" },
  TRANSFERRED:    { label: "Transferred",    bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  DAMAGED:        { label: "Damaged",        bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  MELTED:         { label: "Melted",         bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

const TXN_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  PURCHASE_IN:        { label: "Purchase In",       icon: <Truck size={14} />,          color: "#047857", bg: "#ecfdf5" },
  SALE_OUT:           { label: "Sale Out",           icon: <ShoppingCart size={14} />,   color: "#b91c1c", bg: "#fef2f2" },
  SALE_RETURN_IN:     { label: "Sale Return",        icon: <RotateCcw size={14} />,     color: "#4338ca", bg: "#eef2ff" },
  PURCHASE_RETURN_OUT:{ label: "Purchase Return",    icon: <ArrowLeftRight size={14} />, color: "#c2410c", bg: "#fff7ed" },
  ADJUSTMENT_IN:      { label: "Adjustment In",      icon: <Plus size={14} />,          color: "#047857", bg: "#ecfdf5" },
  ADJUSTMENT_OUT:     { label: "Adjustment Out",     icon: <Minus size={14} />,         color: "#b91c1c", bg: "#fef2f2" },
  TRANSFER_IN:        { label: "Transfer In",        icon: <ArrowRightLeft size={14} />,color: "#0369a1", bg: "#f0f9ff" },
  TRANSFER_OUT:       { label: "Transfer Out",       icon: <ArrowRightLeft size={14} />,color: "#7e22ce", bg: "#fdf4ff" },
  OPENING_STOCK:      { label: "Opening Stock",      icon: <Package size={14} />,       color: "#475569", bg: "#f1f5f9" },
  KARIGAR_ISSUE:      { label: "Karigar Issue",      icon: <Hammer size={14} />,        color: "#7e22ce", bg: "#fdf4ff" },
  KARIGAR_RECEIPT:    { label: "Karigar Receipt",    icon: <Hammer size={14} />,        color: "#047857", bg: "#ecfdf5" },
  HALLMARK_SEND:      { label: "Hallmark Send",      icon: <ShieldCheck size={14} />,   color: "#0369a1", bg: "#f0f9ff" },
  HALLMARK_RECEIVE:   { label: "Hallmark Receive",   icon: <ShieldCheck size={14} />,   color: "#047857", bg: "#ecfdf5" },
  MELTING:            { label: "Melting",             icon: <Flame size={14} />,         color: "#b91c1c", bg: "#fef2f2" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = "stock" | "movements" | "adjustments";

export default function InventoryClient({
  initialItems = INVENTORY_DATA,
  initialMovements = MOVEMENTS,
  initialAdjustments = ADJUSTMENTS,
  branches = [],
}: {
  initialItems?: InventoryItem[];
  initialMovements?: StockMovement[];
  initialAdjustments?: StockAdjustmentRecord[];
  branches?: { id: string; name: string }[];
}) {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(initialItems);
  const [movementsData, setMovementsData] = useState<StockMovement[]>(initialMovements);
  const [adjustmentsData, setAdjustmentsData] = useState<StockAdjustmentRecord[]>(initialAdjustments);

  const [activeTab, setActiveTab] = useState<TabId>("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [purityFilter, setPurityFilter] = useState<string>("ALL");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const handleAdjustmentSuccess = (
    productId: string,
    change: number,
    reason: string,
    notes: string
  ) => {
    setInventoryData((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: Math.max(0, item.quantity + change),
              status: item.quantity + change > 0 ? "IN_STOCK" : "SOLD",
            }
          : item
      )
    );
    const prod = inventoryData.find((p) => p.id === productId);
    if (prod) {
      const now = new Date();
      setMovementsData((prev) => [
        {
          id: `txn-${Date.now()}`,
          date: "Today",
          time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
          type: change > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          sku: prod.sku,
          productName: prod.name,
          quantityChange: change,
          weightChange: change * (prod.grossWeight / (prod.quantity || 1)),
          reference: "ADJ-LIVE",
          referenceType: "ADJUSTMENT",
          notes,
          user: "Manager",
          branch: prod.branch || branches[0]?.name || "Main Branch",
        },
        ...prev,
      ]);
      setAdjustmentsData((prev) => [
        {
          id: `adj-${Date.now()}`,
          date: "Today",
          sku: prod.sku,
          productName: prod.name,
          reason,
          qtyBefore: prod.quantity,
          qtyAfter: prod.quantity + change,
          change,
          notes,
          approvedBy: "Manager",
          status: "APPROVED",
        },
        ...prev,
      ]);
    }
  };

  // ─── Derived data
  const filteredInventory = useMemo(() => {
    return inventoryData.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery) ||
        item.huid.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
      const matchesPurity = purityFilter === "ALL" || item.purity === purityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPurity;
    });
  }, [inventoryData, searchQuery, statusFilter, categoryFilter, purityFilter]);

  const categories = [...new Set(inventoryData.map((i) => i.category))];
  const purities = [...new Set(inventoryData.map((i) => i.purity))];

  // ─── KPIs
  const inStockItems = inventoryData.filter((i) => i.status === "IN_STOCK");
  const totalItems = inStockItems.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = inventoryData.reduce((s, i) => s + i.netWeight * (i.status === "IN_STOCK" ? i.quantity : 0), 0);
  const totalValue = inStockItems.reduce((s, i) => s + i.currentValue * i.quantity, 0);
  const lowStockCount = inStockItems.filter((i) => i.quantity <= 2).length;
  const outForProcessing = inventoryData.filter((i) => ["WITH_KARIGAR", "IN_HALLMARKING", "IN_REPAIR"].includes(i.status)).length;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "stock", label: "All Stock", icon: <Boxes size={16} />, count: inventoryData.length },
    { id: "movements", label: "Movement History", icon: <History size={16} />, count: movementsData.length },
    { id: "adjustments", label: "Adjustments", icon: <ClipboardList size={16} />, count: adjustmentsData.length },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ─── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            Live stock positions · Immutable movement trail · Auditable adjustments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-outline text-xs"
            id="inventory-reconcile-btn"
            onClick={() => setActiveTab("movements")}
          >
            <BarChart3 size={14} /> Reconciliation
          </button>
          <button
            className="btn-gold text-xs"
            id="inventory-adjust-btn"
            onClick={() => setShowAdjustModal(true)}
          >
            <Plus size={14} /> New Adjustment
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "In-Stock Items",
            value: totalItems.toString(),
            sub: `${inStockItems.length} unique products`,
            icon: <Package size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Total Gold Weight",
            value: `${totalWeight.toFixed(1)}g`,
            sub: "Net weight (all purities)",
            icon: <Scale size={18} />,
            color: "#b45309", bg: "#fffbeb", border: "#fde68a",
          },
          {
            label: "Stock Value",
            value: fmt(totalValue),
            sub: "Current market valuation",
            icon: <TrendingUp size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Low Stock",
            value: lowStockCount.toString(),
            sub: "Items with ≤ 2 qty",
            icon: <AlertCircle size={18} />,
            color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
          },
          {
            label: "Out for Processing",
            value: outForProcessing.toString(),
            sub: "Karigar · Hallmark · Repair",
            icon: <Wrench size={18} />,
            color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
          },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`stat-card animate-fade-up stagger-${i + 1}`} style={{ padding: "1rem 1.25rem" }}>
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center border"
                style={{ background: kpi.bg, color: kpi.color, borderColor: kpi.border }}
              >
                {kpi.icon}
              </div>
            </div>
            <div>
              <p
                className="text-xl font-extrabold tracking-tight text-slate-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {kpi.value}
              </p>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{kpi.label}</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────── */}
      <div className="card p-1.5 flex gap-1" style={{ background: "#f8fafc" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? "#ffffff" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              border: activeTab === tab.id ? "1px solid var(--border)" : "1px solid transparent",
            }}
            id={`inventory-tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                style={{
                  background: activeTab === tab.id ? "#fffbeb" : "#f1f5f9",
                  color: activeTab === tab.id ? "#92400e" : "#64748b",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: All Stock ──────────────────────────────────────── */}
      {activeTab === "stock" && (
        <div className="space-y-4 animate-fade-up">
          {/* Search + Filters */}
          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <div className="search-wrapper flex-1 min-w-[220px]">
              <Search size={16} className="search-icon-left" />
              <input
                className="input search-input pr-9"
                placeholder="Search by name, SKU, barcode or HUID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="inventory-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                className="input pr-8 appearance-none cursor-pointer"
                style={{ minWidth: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | "ALL")}
                id="inventory-filter-status"
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="relative">
              <select
                className="input pr-8 appearance-none cursor-pointer"
                style={{ minWidth: 130 }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                id="inventory-filter-category"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="relative">
              <select
                className="input pr-8 appearance-none cursor-pointer"
                style={{ minWidth: 110 }}
                value={purityFilter}
                onChange={(e) => setPurityFilter(e.target.value)}
                id="inventory-filter-purity"
              >
                <option value="ALL">All Purity</option>
                {purities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Showing {filteredInventory.length} of {inventoryData.length} products
          </p>

          {/* Inventory Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU / Barcode</th>
                    <th>Category</th>
                    <th>Metal / Purity</th>
                    <th>Gross Wt</th>
                    <th>Net Wt</th>
                    <th>Qty</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const sc = STATUS_CONFIG[item.status];
                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors"
                        onClick={() => { setSelectedProduct(item); setShowDetailPanel(true); }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
                              style={{ background: "#fffbeb", borderColor: "#fde68a" }}
                            >
                              <Gem size={15} style={{ color: "var(--gold-600)" }} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-800 truncate" style={{ maxWidth: 200 }}>
                                {item.name}
                              </p>
                              {item.huid && (
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">HUID: {item.huid}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className="badge badge-info text-[11px]">{item.sku}</span>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">{item.barcode}</p>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-medium text-slate-600">{item.category}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-600">{item.metal}</span>
                            <span className="badge badge-gold text-[10px]">{item.purity}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-semibold text-slate-700">{item.grossWeight.toFixed(1)}g</span>
                        </td>
                        <td>
                          <span className="text-xs font-semibold text-slate-700">{item.netWeight.toFixed(1)}g</span>
                        </td>
                        <td>
                          <span
                            className={`badge text-xs font-bold ${
                              item.quantity <= 2 && item.status === "IN_STOCK"
                                ? "badge-danger"
                                : "badge-success"
                            }`}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-bold text-gold">{fmt(item.currentValue)}</span>
                        </td>
                        <td>
                          <span
                            className="badge text-[10px] whitespace-nowrap"
                            style={{
                              background: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.border}`,
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-ghost p-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(item);
                              setShowDetailPanel(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Movement History ───────────────────────────────── */}
      {activeTab === "movements" && (
        <div className="space-y-4 animate-fade-up">
          {/* Gold Reconciliation Summary */}
          <div
            className="card p-5"
            style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Scale size={18} style={{ color: "#b45309" }} />
              <h3 className="font-bold text-sm" style={{ color: "#78350f", fontFamily: "var(--font-display)" }}>
                Gold Weight Reconciliation — Today (22K)
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Opening", value: "846.2g", icon: <Package size={14} /> },
                { label: "Purchase In", value: "+43.0g", icon: <TrendingUp size={14} />, positive: true },
                { label: "Sale Out", value: "−18.5g", icon: <TrendingDown size={14} />, positive: false },
                { label: "Returns In", value: "+9.2g", icon: <RotateCcw size={14} />, positive: true },
                { label: "Expected Closing", value: "879.9g", icon: <Check size={14} /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(253,211,77,0.4)" }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "#92400e" }}>
                    {item.icon}
                  </div>
                  <p className="text-base font-extrabold" style={{ color: "#78350f", fontFamily: "var(--font-display)" }}>
                    {item.value}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "#b45309" }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Movement Timeline */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="section-title">Immutable Stock Movement Ledger</h3>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                Every movement is permanently recorded — no deletions or silent edits
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Qty Change</th>
                    <th>Weight Change</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsData.map((m) => {
                    const tc = TXN_CONFIG[m.type] || { label: m.type, icon: <History size={14} />, color: "#475569", bg: "#f1f5f9" };
                    const isPositive = m.quantityChange > 0;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{m.date}</p>
                            <p className="text-[10px] font-medium text-slate-400">{m.time}</p>
                          </div>
                        </td>
                        <td>
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold"
                            style={{ background: tc.bg, color: tc.color }}
                          >
                            {tc.icon}
                            {tc.label}
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 truncate" style={{ maxWidth: 180 }}>
                              {m.productName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{m.sku}</p>
                          </div>
                        </td>
                        <td>
                          <span
                            className="text-xs font-bold flex items-center gap-1"
                            style={{ color: isPositive ? "#047857" : "#b91c1c" }}
                          >
                            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {isPositive ? "+" : ""}{m.quantityChange}
                          </span>
                        </td>
                        <td>
                          <span
                            className="text-xs font-bold"
                            style={{ color: isPositive ? "#047857" : "#b91c1c" }}
                          >
                            {isPositive ? "+" : ""}{m.weightChange.toFixed(1)}g
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info text-[10px] font-mono">{m.reference}</span>
                        </td>
                        <td>
                          <p className="text-[11px] text-slate-500 max-w-[160px] truncate">{m.notes}</p>
                        </td>
                        <td>
                          <span className="text-[11px] font-medium text-slate-600">{m.user}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Adjustments ────────────────────────────────────── */}
      {activeTab === "adjustments" && (
        <div className="space-y-4 animate-fade-up">
          <div className="card p-4 flex items-center justify-between" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: "#b45309" }} />
              <p className="text-xs font-semibold" style={{ color: "#78350f" }}>
                Stock adjustments require manager approval. Direct stock edits are not allowed.
              </p>
            </div>
            <button
              className="btn-gold text-xs"
              onClick={() => setShowAdjustModal(true)}
              id="inventory-new-adjust-btn"
            >
              <Plus size={14} /> New Adjustment
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Reason</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Change</th>
                    <th>Notes</th>
                    <th>Approved By</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentsData.map((adj) => (
                    <tr key={adj.id}>
                      <td>
                        <span className="text-xs font-semibold text-slate-800">{adj.date}</span>
                      </td>
                      <td>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 truncate" style={{ maxWidth: 160 }}>
                            {adj.productName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{adj.sku}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-600">{adj.reason}</span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-700">{adj.qtyBefore}</span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-700">{adj.qtyAfter}</span>
                      </td>
                      <td>
                        <span
                          className="text-xs font-bold flex items-center gap-1"
                          style={{ color: adj.change > 0 ? "#047857" : adj.change < 0 ? "#b91c1c" : "#475569" }}
                        >
                          {adj.change > 0 && <ArrowUpRight size={12} />}
                          {adj.change < 0 && <ArrowDownRight size={12} />}
                          {adj.change > 0 ? "+" : ""}{adj.change}
                        </span>
                      </td>
                      <td>
                        <p className="text-[11px] text-slate-500 max-w-[140px] truncate">{adj.notes}</p>
                      </td>
                      <td>
                        <span className="text-[11px] font-medium text-slate-600">{adj.approvedBy}</span>
                      </td>
                      <td>
                        <span
                          className="badge text-[10px]"
                          style={{
                            background: adj.status === "APPROVED" ? "#ecfdf5" : adj.status === "PENDING" ? "#fffbeb" : "#fef2f2",
                            color: adj.status === "APPROVED" ? "#047857" : adj.status === "PENDING" ? "#92400e" : "#b91c1c",
                            border: `1px solid ${adj.status === "APPROVED" ? "#a7f3d0" : adj.status === "PENDING" ? "#fde68a" : "#fecaca"}`,
                          }}
                        >
                          {adj.status === "APPROVED" && <Check size={10} className="mr-1" />}
                          {adj.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Product Detail Slide-over Panel ─────────────────────── */}
      <SlideOver
        isOpen={showDetailPanel && !!selectedProduct}
        onClose={() => setShowDetailPanel(false)}
        title="Product Details"
        subtitle={selectedProduct ? `${selectedProduct.sku} · ${selectedProduct.name}` : ""}
      >
        {selectedProduct && (
          <div className="space-y-6">
              {/* Product header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center border shrink-0"
                  style={{ background: "#fffbeb", borderColor: "#fde68a" }}
                >
                  <Gem size={24} style={{ color: "var(--gold-600)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-lg text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                    {selectedProduct.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-info text-[11px]">{selectedProduct.sku}</span>
                    {selectedProduct.huid && (
                      <span className="badge badge-gold text-[10px]">HUID: {selectedProduct.huid}</span>
                    )}
                  </div>
                  <span
                    className="badge text-[10px] mt-2 inline-block"
                    style={{
                      background: STATUS_CONFIG[selectedProduct.status].bg,
                      color: STATUS_CONFIG[selectedProduct.status].color,
                      border: `1px solid ${STATUS_CONFIG[selectedProduct.status].border}`,
                    }}
                  >
                    {STATUS_CONFIG[selectedProduct.status].label}
                  </span>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Category", value: selectedProduct.category },
                  { label: "Metal", value: selectedProduct.metal },
                  { label: "Purity", value: `${selectedProduct.purity} (${(selectedProduct.fineness * 100).toFixed(2)}%)` },
                  { label: "Branch", value: selectedProduct.branch },
                  { label: "Gross Weight", value: `${selectedProduct.grossWeight.toFixed(3)}g` },
                  { label: "Stone Weight", value: `${selectedProduct.stoneWeight.toFixed(3)}g` },
                  { label: "Net Weight", value: `${selectedProduct.netWeight.toFixed(3)}g` },
                  { label: "Quantity", value: selectedProduct.quantity.toString() },
                  { label: "Purchase Cost", value: fmt(selectedProduct.purchaseCost) },
                  { label: "Current Value", value: fmt(selectedProduct.currentValue) },
                  { label: "Barcode", value: selectedProduct.barcode },
                  { label: "Last Movement", value: selectedProduct.lastMovement },
                ].map((d) => (
                  <div key={d.label} className="rounded-xl p-3 border" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d.label}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>

              {/* Movement Timeline for this product */}
              <div>
                <h4 className="section-title mb-3 flex items-center gap-2">
                  <History size={16} style={{ color: "var(--gold-500)" }} />
                  Recent Movements
                </h4>
                <div className="space-y-2">
                  {movementsData.filter((m) => m.sku === selectedProduct.sku)
                    .slice(0, 5)
                    .map((m) => {
                      const tc = TXN_CONFIG[m.type] || { label: m.type, icon: <History size={12} />, color: "#475569", bg: "#f1f5f9" };
                      const isPositive = m.quantityChange > 0;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{ borderColor: "#e2e8f0", background: "#ffffff" }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: tc.bg, color: tc.color }}
                          >
                            {tc.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800">{tc.label}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{m.notes}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p
                              className="text-xs font-bold"
                              style={{ color: isPositive ? "#047857" : "#b91c1c" }}
                            >
                              {isPositive ? "+" : ""}{m.quantityChange} ({isPositive ? "+" : ""}{m.weightChange.toFixed(1)}g)
                            </p>
                            <p className="text-[10px] text-slate-400">{m.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  {movementsData.filter((m) => m.sku === selectedProduct.sku).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No movements recorded yet</p>
                  )}
                </div>
              </div>
            </div>
        )}
      </SlideOver>

      {/* ─── Stock Adjustment Modal ──────────────────────────────── */}
      {showAdjustModal && (
        <StockAdjustmentModal
          products={inventoryData.filter((i) => i.status === "IN_STOCK")}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  );
}

// ─── Stock Adjustment Modal Component ─────────────────────────────────────────

function StockAdjustmentModal({
  products,
  onClose,
  onSuccess,
}: {
  products: InventoryItem[];
  onClose: () => void;
  onSuccess?: (productId: string, change: number, reason: string, notes: string) => void;
}) {
  const [selectedSku, setSelectedSku] = useState("");
  const [adjustType, setAdjustType] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedProduct = products.find((p) => p.sku === selectedSku);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const qtyNum = parseInt(quantity, 10);
      const qtyChange = adjustType === "increase" ? qtyNum : -qtyNum;
      const weightPerUnit = selectedProduct.grossWeight / (selectedProduct.quantity || 1);
      const grossChange = qtyChange * weightPerUnit;

      const res = await recordStockAdjustmentAction({
        productId: selectedProduct.id,
        quantityChange: qtyChange,
        grossWeightChange: grossChange,
        reason,
        notes,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to record adjustment.");
      } else {
        onSuccess?.(selectedProduct.id, qtyChange, reason, notes);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to submit adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="New Stock Adjustment"
      icon={<ClipboardList size={18} style={{ color: "#b45309" }} />}
      maxWidth="max-w-md"
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Select Product</label>
            <div className="relative">
              <select
                className="input appearance-none cursor-pointer"
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                required
                id="adjust-product-select"
              >
                <option value="">Choose a product…</option>
                {products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} ({p.sku}) — Qty: {p.quantity}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>

          {selectedProduct && (
            <div
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ background: "#fffbeb", borderColor: "#fde68a" }}
              >
                <Gem size={14} style={{ color: "var(--gold-600)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800">{selectedProduct.name}</p>
                <p className="text-[10px] text-slate-400">
                  Current stock: <strong className="text-slate-700">{selectedProduct.quantity} pcs</strong> · {selectedProduct.netWeight.toFixed(1)}g net
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all"
                style={{
                  background: adjustType === "increase" ? "#ecfdf5" : "#ffffff",
                  color: adjustType === "increase" ? "#047857" : "#64748b",
                  borderColor: adjustType === "increase" ? "#a7f3d0" : "#e2e8f0",
                }}
                onClick={() => setAdjustType("increase")}
              >
                <ArrowUpRight size={14} /> Increase
              </button>
              <button
                type="button"
                className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all"
                style={{
                  background: adjustType === "decrease" ? "#fef2f2" : "#ffffff",
                  color: adjustType === "decrease" ? "#b91c1c" : "#64748b",
                  borderColor: adjustType === "decrease" ? "#fecaca" : "#e2e8f0",
                }}
                onClick={() => setAdjustType("decrease")}
              >
                <ArrowDownRight size={14} /> Decrease
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Quantity</label>
            <input
              className="input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              id="adjust-quantity"
            />
          </div>

          <div>
            <label className="input-label">Reason *</label>
            <div className="relative">
              <select
                className="input appearance-none cursor-pointer"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                id="adjust-reason"
              >
                <option value="">Select reason…</option>
                <option value="physical_count">Physical Count Mismatch</option>
                <option value="damaged">Damaged / Defective</option>
                <option value="melting">Sent for Melting</option>
                <option value="found">Found (Missing Item Located)</option>
                <option value="data_error">Data Entry Correction</option>
                <option value="weight_correction">Weight Correction</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>

          <div>
            <label className="input-label">Notes (Mandatory)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe the reason for adjustment in detail…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              id="adjust-notes"
              style={{ resize: "vertical" }}
            />
          </div>

          <div
            className="p-3 rounded-xl border flex items-start gap-2"
            style={{ background: "#fef3c7", borderColor: "#fcd34d" }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "#92400e" }} />
            <p className="text-[11px] font-medium" style={{ color: "#78350f" }}>
              This adjustment will be submitted for <strong>manager approval</strong>.
              An immutable audit trail entry will be created.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl border flex items-start gap-2 bg-red-50 border-red-200">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
              <p className="text-xs font-medium text-red-700">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn-outline flex-1 justify-center"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gold flex-1 justify-center"
              disabled={submitting}
              id="adjust-submit-btn"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </span>
              ) : (
                <>
                  <Check size={14} /> Submit Adjustment
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
  );
}
