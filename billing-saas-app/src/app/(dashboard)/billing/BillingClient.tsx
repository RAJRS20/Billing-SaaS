"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Trash2,
  Barcode,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Receipt,
  Printer,
  ChevronDown,
  Gem,
  Scale,
  Percent,
  Tag,
  Zap,
  CheckCircle2,
  X,
  ShieldAlert,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { calculatePricing, type ProductPricingInput } from "@/lib/pricing";
import { finalizePOSSaleAction } from "@/app/actions/pos";
import Modal from "@/components/Modal";
import { createEstimateAction } from "@/app/actions/estimates";
import PrintableInvoiceReceipt, { PrintableReceiptData } from "@/components/PrintableInvoiceReceipt";

export interface BillingClientProps {
  initialProducts?: CartItem[];
  liveRates?: { karat: number; ratePerGram: number }[];
  active22KRate?: number;
  initialCustomers?: { id: string; name: string; phone: string; panNumber: string | null }[];
  panThreshold?: number;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  category: string;
  metal: string;
  purity: string;
  barcode: string;
  huid: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  wastageType: "PERCENTAGE" | "WEIGHT_GRAMS";
  wastageValue: number;
  makingChargeType: "PER_GRAM" | "PERCENTAGE" | "FIXED";
  makingChargeValue: number;
  stoneChargeFixed: number;
  goldRate: number;
  qty: number;
  discount: number;
}

// ─── Mock product catalog ────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: "p1", productId: "p1", name: "22K Gold Necklace (Classic)", sku: "NK-22K-001",
    category: "Necklace", metal: "Gold", purity: "22K", barcode: "BRC001", huid: "AB1234",
    grossWeight: 18.5, stoneWeight: 0, netWeight: 18.5,
    wastageType: "PERCENTAGE" as const, wastageValue: 2,
    makingChargeType: "PER_GRAM" as const, makingChargeValue: 120, stoneChargeFixed: 0,
    goldRate: 6120, qty: 1, discount: 0,
  },
  {
    id: "p2", productId: "p2", name: "18K Diamond Ring (Solitaire)", sku: "RG-18K-001",
    category: "Ring", metal: "Gold", purity: "18K", barcode: "BRC002", huid: "CD5678",
    grossWeight: 4.2, stoneWeight: 0.8, netWeight: 3.4,
    wastageType: "PERCENTAGE" as const, wastageValue: 1.5,
    makingChargeType: "PERCENTAGE" as const, makingChargeValue: 12, stoneChargeFixed: 15000,
    goldRate: 5004, qty: 1, discount: 0,
  },
  {
    id: "p3", productId: "p3", name: "22K Gold Bangles (Pair)", sku: "BG-22K-001",
    category: "Bangle", metal: "Gold", purity: "22K", barcode: "BRC003", huid: "EF9012",
    grossWeight: 32.8, stoneWeight: 0, netWeight: 32.8,
    wastageType: "WEIGHT_GRAMS" as const, wastageValue: 0.5,
    makingChargeType: "PER_GRAM" as const, makingChargeValue: 100, stoneChargeFixed: 0,
    goldRate: 6120, qty: 1, discount: 0,
  },
  {
    id: "p4", productId: "p4", name: "22K Gold Jhumka Earrings", sku: "ER-22K-001",
    category: "Earring", metal: "Gold", purity: "22K", barcode: "BRC004", huid: "GH3456",
    grossWeight: 8.6, stoneWeight: 1.2, netWeight: 7.4,
    wastageType: "PERCENTAGE" as const, wastageValue: 1.8,
    makingChargeType: "PER_GRAM" as const, makingChargeValue: 150, stoneChargeFixed: 500,
    goldRate: 6120, qty: 1, discount: 0,
  },
  {
    id: "p5", productId: "p5", name: "22K Gold Chain (18 inch)", sku: "CH-22K-001",
    category: "Chain", metal: "Gold", purity: "22K", barcode: "BRC005", huid: "IJ7890",
    grossWeight: 9.2, stoneWeight: 0, netWeight: 9.2,
    wastageType: "PERCENTAGE" as const, wastageValue: 1.5,
    makingChargeType: "FIXED" as const, makingChargeValue: 800, stoneChargeFixed: 0,
    goldRate: 6120, qty: 1, discount: 0,
  },
];

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: <Banknote size={18} /> },
  { id: "UPI", label: "UPI", icon: <Smartphone size={18} /> },
  { id: "CARD", label: "Card", icon: <CreditCard size={18} /> },
  { id: "BANK_TRANSFER", label: "Bank Transfer", icon: <Building2 size={18} /> },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function computeItemPricing(item: CartItem) {
  const input: ProductPricingInput = {
    grossWeight: item.grossWeight,
    stoneWeight: item.stoneWeight,
    wastageType: item.wastageType,
    wastageValue: item.wastageValue,
    goldRatePerGram: item.goldRate,
    makingChargeType: item.makingChargeType,
    makingChargeValue: item.makingChargeValue,
    stoneChargeFixed: item.stoneChargeFixed,
    discountType: "PERCENTAGE",
    discountValue: item.discount,
    cgstPercent: 1.5,
    sgstPercent: 1.5,
    igstPercent: 0,
    roundToNearest: 1,
  };
  return calculatePricing(input);
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function BillingClient({
  initialProducts = [],
  liveRates = [],
  active22KRate = 6120,
  initialCustomers = [],
  panThreshold = 200000,
}: BillingClientProps) {
  const productCatalog = initialProducts.length > 0 ? initialProducts : PRODUCTS;
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomers[0]?.id ?? null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<string>("INV-2026-0001");
  const [panInput, setPanInput] = useState("");
  const [showPanModal, setShowPanModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showEstimateSuccess, setShowEstimateSuccess] = useState(false);
  const [createdEstimateNumber, setCreatedEstimateNumber] = useState<string | null>(null);
  const [isCreatingEstimate, setIsCreatingEstimate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastFinalizedInvoice, setLastFinalizedInvoice] = useState<PrintableReceiptData | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = productCatalog.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.huid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = useCallback((product: (typeof productCatalog)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product }];
    });
    setSearchQuery("");
  }, []);

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateRate = (id: string, rate: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, goldRate: rate } : i))
    );
  };

  const updateDiscount = (id: string, disc: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, discount: disc } : i))
    );
  };

  // Compute totals
  const itemTotals = cart.map((item) => ({
    item,
    pricing: computeItemPricing(item),
  }));

  const subtotal = itemTotals.reduce((s, t) => s + t.pricing.grossAmount, 0);
  const totalDiscount = itemTotals.reduce((s, t) => s + t.pricing.discountAmount, 0) + discount;
  const totalTax = itemTotals.reduce((s, t) => s + t.pricing.totalTaxAmount, 0);
  const grandTotal = itemTotals.reduce((s, t) => s + t.pricing.roundedAmount, 0) - discount;
  const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - grandTotal) : 0;

  const currentCust = initialCustomers.find((c) => c.id === selectedCustomerId);

  const activePrintData: PrintableReceiptData = lastFinalizedInvoice || {
    invoiceNumber: createdInvoiceNumber || "INV-2026-0001",
    date: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date()),
    customer: currentCust
      ? {
          name: currentCust.name,
          phone: currentCust.phone,
          address: "Tirupati, Andhra Pradesh",
          panNumber: currentCust.panNumber || panInput || undefined,
        }
      : null,
    cashierName: "Admin User",
    items: cart.map((i) => {
      const pricing = computeItemPricing(i);
      return {
        name: i.name,
        sku: i.sku,
        huid: i.huid,
        purity: i.purity,
        grossWeight: i.grossWeight,
        netWeight: i.netWeight,
        goldRate: i.goldRate,
        makingCharges: pricing.makingCharge,
        wastageValue: i.wastageValue,
        total: pricing.grossAmount,
      };
    }),
    subtotal,
    totalDiscount,
    taxableAmount: Math.max(0, subtotal - totalDiscount),
    cgst: totalTax / 2,
    sgst: totalTax / 2,
    totalTax,
    grandTotal: Math.max(0, grandTotal),
    paymentMode: selectedPayment,
    cashReceived: cashReceived ? parseFloat(cashReceived) : Math.max(0, grandTotal),
    change,
    notes,
  };

  const handleFinalize = async (overridePan?: string) => {
    if (cart.length === 0 || isSubmitting) return;

    const effectivePan = overridePan || panInput || currentCust?.panNumber;

    // Check PAN compliance if cash >= panThreshold
    if (selectedPayment === "CASH" && grandTotal >= panThreshold) {
      if (!effectivePan) {
        setShowPanModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await finalizePOSSaleAction({
      customerId: selectedCustomerId || undefined,
      items: cart.map((i) => {
        const itemPricing = computeItemPricing(i);
        return {
          productId: i.productId,
          quantity: i.qty,
          customRatePerGram: i.goldRate,
          discountAmount: itemPricing.discountAmount + (cart.length > 0 ? discount / cart.length : 0),
        };
      }),
      payments: [
        {
          method: selectedPayment as any,
          amount: Math.max(0, grandTotal),
          reference: notes || undefined,
        },
      ],
      notes: notes || undefined,
    });
    setIsSubmitting(false);

    if (res.success && res.invoiceNumber) {
      setCreatedInvoiceNumber(res.invoiceNumber);

      const invoiceSnapshot: PrintableReceiptData = {
        invoiceNumber: res.invoiceNumber,
        date: new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
        customer: currentCust
          ? {
              name: currentCust.name,
              phone: currentCust.phone,
              address: "Tirupati, Andhra Pradesh",
              panNumber: effectivePan || undefined,
            }
          : null,
        cashierName: "Admin User",
        items: cart.map((i) => {
          const pricing = computeItemPricing(i);
          return {
            name: i.name,
            sku: i.sku,
            huid: i.huid,
            purity: i.purity,
            grossWeight: i.grossWeight,
            netWeight: i.netWeight,
            goldRate: i.goldRate,
            makingCharges: pricing.makingCharge,
            wastageValue: i.wastageValue,
            total: pricing.grossAmount,
          };
        }),
        subtotal,
        totalDiscount,
        taxableAmount: Math.max(0, subtotal - totalDiscount),
        cgst: totalTax / 2,
        sgst: totalTax / 2,
        totalTax,
        grandTotal: Math.max(0, grandTotal),
        paymentMode: selectedPayment,
        cashReceived: cashReceived ? parseFloat(cashReceived) : Math.max(0, grandTotal),
        change,
        notes,
      };

      setLastFinalizedInvoice(invoiceSnapshot);
      setShowSuccess(true);
    } else {
      setErrorMessage(`POS Finalization Failed: ${res.error || "Failed to commit sale to PostgreSQL."}`);
    }
  };

  const handleCreateEstimate = async () => {
    if (cart.length === 0 || isCreatingEstimate) return;
    setIsCreatingEstimate(true);
    setErrorMessage(null);

    const res = await createEstimateAction({
      customerId: selectedCustomerId || undefined,
      customerName: currentCust?.name || "Walk-in Customer",
      customerPhone: currentCust?.phone || undefined,
      notes: notes || undefined,
      discountAmount: totalDiscount,
      items: cart.map((i) => {
        const pricing = computeItemPricing(i);
        return {
          productId: i.productId,
          productName: i.name,
          grossWeight: i.grossWeight,
          netWeight: i.netWeight,
          goldRatePerGram: i.goldRate,
          makingCharge: pricing.makingCharge,
          stoneCharge: i.stoneChargeFixed,
          quantity: i.qty,
        };
      }),
    });
    setIsCreatingEstimate(false);

    if (res.success && res.estimate) {
      setCreatedEstimateNumber(res.estimate.estimateNumber);
      setShowEstimateSuccess(true);
    } else {
      setErrorMessage(`Failed to generate estimate: ${res.error || "Unknown server error"}`);
    }
  };

  const handlePrintClick = () => {
    if (cart.length === 0 && !lastFinalizedInvoice) {
      setErrorMessage("Please add jewellery items to the bill or finalize a sale before printing.");
      return;
    }
    setShowPrintPreview(true);
  };

  const handleResetSale = () => {
    setShowSuccess(false);
    setCart([]);
    setDiscount(0);
    setCashReceived("");
    setNotes("");
  };

  return (
    <>
      <div className="flex gap-4 h-[calc(100vh-100px)] animate-fade-up">
      {/* ──────────────────────────────────────────
          Left Panel: Product Search + Cart
      ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 gap-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              New Bill — POS
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              22K Gold Rate: <span className="font-semibold text-gold">₹{active22KRate.toLocaleString("en-IN")}/g</span>
              &nbsp;·&nbsp;Rate locked at invoice generation
            </p>
          </div>
          {/* Customer selector */}
          <div className="relative">
            <button
              className="btn-outline flex items-center gap-2"
              id="select-customer-btn"
              onClick={() => setShowCustomerDropdown((prev) => !prev)}
            >
              <User size={16} />
              {currentCust ? `${currentCust.name} (${currentCust.phone})` : "Select Customer"}
              <ChevronDown size={14} />
            </button>
            {showCustomerDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-30 p-2">
                <p className="text-xs font-semibold px-2 py-1 text-slate-500 uppercase">Registered Customers</p>
                {initialCustomers.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded-lg flex flex-col"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="text-slate-500">{c.phone} {c.panNumber ? `· PAN: ${c.panNumber}` : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Search */}
        <div className="card p-4">
          <div className="flex gap-3">
            <div className="search-wrapper flex-1">
              <Search
                size={16}
                className="search-icon-left"
              />
              <input
                id="product-search"
                type="text"
                className="input search-input pr-10"
                placeholder="Search by name, SKU, barcode or HUID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button className="btn-outline gap-2" id="barcode-scan-btn">
              <Barcode size={16} /> Scan
            </button>
          </div>

          {/* Search results dropdown */}
          {searchQuery && filtered.length > 0 && (
            <div
              className="mt-2 rounded-xl overflow-hidden border"
              style={{ borderColor: "var(--border)" }}
            >
              {filtered.map((p) => {
                const pr = computeItemPricing({ ...p, discount: 0 });
                return (
                  <button
                    key={p.id}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-100 border-b last:border-b-0"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
                    }}
                    onClick={() => addToCart(p)}
                    id={`add-product-${p.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(245,158,11,0.12)" }}
                      >
                        <Gem size={14} style={{ color: "var(--gold-400)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {p.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {p.sku} · {p.purity} · {p.grossWeight}g · HUID: {p.huid}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gold">{fmt(pr.roundedAmount)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {p.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {searchQuery && filtered.length === 0 && (
            <p className="text-sm text-center py-3" style={{ color: "var(--text-muted)" }}>
              No products found for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>

        {/* Cart */}
        <div className="card flex-1 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h2 className="section-title">
              Bill Items{" "}
              {cart.length > 0 && (
                <span className="badge badge-gold ml-2">{cart.length}</span>
              )}
            </h2>
            {cart.length > 0 && (
              <button
                className="text-xs"
                onClick={() => setCart([])}
                style={{ color: "var(--danger)" }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.08)" }}
                >
                  <Gem size={28} style={{ color: "var(--gold-500)" }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Search and add jewellery items above
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Supports barcode scanning for faster billing
                </p>
              </div>
            ) : (
              <div>
                {itemTotals.map(({ item, pricing }) => (
                  <div
                    key={item.id}
                    className="px-5 py-4 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                          style={{ background: "#fffbeb", borderColor: "#fde68a" }}
                        >
                          <Gem size={15} style={{ color: "var(--gold-600)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            {item.name}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="badge badge-gold text-xs">{item.purity}</span>
                            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                              <Scale size={11} /> {item.grossWeight}g gross
                            </span>
                            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                              HUID: {item.huid}
                            </span>
                          </div>

                          {/* Pricing breakdown */}
                          <div
                            className="mt-2.5 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 border"
                            style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                          >
                            {[
                              ["Net Wt", `${pricing.netGoldWeight}g`],
                              ["Wastage", `${pricing.wastageGrams}g`],
                              ["Gold Value", fmt(pricing.goldValue)],
                              ["Making", fmt(pricing.makingCharge)],
                              ["Stone Charge", fmt(pricing.stoneCharge)],
                              ...(pricing.discountAmount > 0
                                ? [["Disc (" + item.discount + "%)", `-${fmt(pricing.discountAmount)}`]] as [string, string][]
                                : []),
                              ["Tax (3%)", fmt(pricing.totalTaxAmount)],
                            ].map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-1">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{k}</span>
                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Gold rate + discount inputs */}
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Rate:</span>
                              {editingRate === item.id ? (
                                <input
                                  type="number"
                                  className="input py-1 px-2 text-xs w-24"
                                  defaultValue={item.goldRate}
                                  onBlur={(e) => {
                                    updateRate(item.id, parseFloat(e.target.value) || item.goldRate);
                                    setEditingRate(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  className="text-xs font-semibold text-gold underline"
                                  onClick={() => setEditingRate(item.id)}
                                >
                                  ₹{item.goldRate}/g
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Percent size={11} style={{ color: "var(--text-muted)" }} />
                              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Disc:</span>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className="input py-1 pl-2 pr-5 text-xs w-20 font-medium"
                                  value={item.discount || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    updateDiscount(item.id, Math.min(100, Math.max(0, val)));
                                  }}
                                  placeholder="0"
                                />
                                <span className="absolute right-2 text-xs font-semibold pointer-events-none" style={{ color: "var(--text-muted)" }}>
                                  %
                                </span>
                              </div>
                              {pricing.discountAmount > 0 && (
                                <span className="text-xs font-semibold text-emerald-600">
                                  (-{fmt(pricing.discountAmount)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p
                          className="text-lg font-bold"
                          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                        >
                          {fmt(pricing.roundedAmount)}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="btn-ghost p-1.5 rounded-lg text-xs"
                          style={{ color: "var(--danger)" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────
          Right Panel: Summary + Payment
      ─────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col gap-4">
        {/* Bill Summary */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Bill Summary</h2>
          <div className="space-y-2.5 text-sm">
            {[
              ["Subtotal", fmt(subtotal)],
              ["Discount", `-${fmt(totalDiscount)}`],
              ["CGST (1.5%)", fmt(totalTax / 2)],
              ["SGST (1.5%)", fmt(totalTax / 2)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>{k}</span>
                <span style={{ color: "var(--text-secondary)" }}>{v}</span>
              </div>
            ))}
            <div className="divider my-2" />
            {/* Extra invoice-level discount */}
            <div className="flex items-center gap-2">
              <Percent size={13} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Extra Discount (₹)
              </span>
              <input
                type="number"
                className="input py-1 px-2 text-xs w-24 ml-auto"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="₹0"
                id="invoice-discount"
              />
            </div>
            <div className="divider" />
            <div className="flex justify-between font-bold text-base">
              <span style={{ color: "var(--text-primary)" }}>Grand Total</span>
              <span className="text-gold" style={{ fontFamily: "var(--font-display)" }}>
                {fmt(Math.max(0, grandTotal))}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Payment Method</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PAYMENT_METHODS.map((m) => {
              const isSelected = selectedPayment === m.id;
              return (
                <button
                  key={m.id}
                  id={`payment-${m.id}`}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                    isSelected
                      ? "bg-amber-50/80 border-amber-300 text-amber-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedPayment(m.id)}
                >
                  <span className={isSelected ? "text-amber-700" : "text-slate-500"}>
                    {m.icon}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {selectedPayment === "CASH" && (
            <div className="mb-3 space-y-2">
              <div>
                <label className="input-label">Cash Received</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Enter amount…"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  id="cash-received"
                />
                {parseFloat(cashReceived) > 0 && (
                  <div className="flex justify-between mt-1 text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Change</span>
                    <span
                      className="font-bold"
                      style={{ color: change >= 0 ? "#34d399" : "#f87171" }}
                    >
                      {fmt(change)}
                    </span>
                  </div>
                )}
              </div>

              {grandTotal >= panThreshold && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <ShieldAlert size={14} className="text-amber-700 shrink-0" />
                    Statutory PAN Compliance (Rule 114B)
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Cash receipt is ₹{grandTotal.toLocaleString("en-IN")} (exceeds ₹{panThreshold.toLocaleString("en-IN")}). Customer PAN is mandatory under IT Act.
                  </p>
                  <div className="mt-2">
                    <label className="text-[11px] font-semibold text-slate-700">Customer PAN Card</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={panInput || currentCust?.panNumber || ""}
                      onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                      className="input py-1.5 text-xs font-mono uppercase font-bold bg-white mt-0.5 tracking-wider w-full"
                      id="pos-pan-input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {["UPI", "CARD", "BANK_TRANSFER"].includes(selectedPayment) && (
            <div className="mb-3">
              <label className="input-label">Transaction Reference</label>
              <input
                type="text"
                className="input"
                placeholder="UPI ID / Card last 4 / Txn no."
                id="payment-reference"
              />
            </div>
          )}

          <div className="mb-3">
            <label className="input-label">Notes (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any special note…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              id="invoice-notes"
            />
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start justify-between gap-2 animate-fade-in mb-1">
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            className="btn-gold w-full justify-center text-base py-3"
            id="finalize-invoice-btn"
            onClick={() => handleFinalize()}
            disabled={cart.length === 0 || isSubmitting}
            style={{ opacity: cart.length === 0 || isSubmitting ? 0.5 : 1 }}
          >
            <Zap size={18} /> {isSubmitting ? "Finalizing in PostgreSQL…" : `Finalize Invoice (${fmt(Math.max(0, grandTotal))})`}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline flex-1 justify-center gap-2"
              id="print-invoice-btn"
              onClick={handlePrintClick}
              disabled={cart.length === 0 && !lastFinalizedInvoice}
              style={{ opacity: cart.length === 0 && !lastFinalizedInvoice ? 0.5 : 1 }}
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="btn-outline flex-1 justify-center gap-2"
              id="save-estimate-btn"
              onClick={handleCreateEstimate}
              disabled={cart.length === 0 || isCreatingEstimate}
              style={{ opacity: cart.length === 0 || isCreatingEstimate ? 0.5 : 1 }}
            >
              <Receipt size={15} /> {isCreatingEstimate ? "Saving…" : "Estimate"}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* PAN Compliance Modal */}
      <Modal
        isOpen={showPanModal}
        onClose={() => setShowPanModal(false)}
        title="Mandatory PAN Requirement"
        icon={<ShieldAlert className="text-amber-700" size={20} />}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold">Income Tax Rule 114B & Section 269ST:</p>
            <p className="mt-1 text-amber-800">
              For jewellery cash purchases of ₹2,00,000 or more, quoting customer PAN is mandatory by Indian statutory law.
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Enter Customer PAN</label>
            <input
              type="text"
              autoFocus
              maxLength={10}
              placeholder="ABCDE1234F"
              value={panInput}
              onChange={(e) => setPanInput(e.target.value.toUpperCase())}
              className="input mt-1.5 uppercase font-mono tracking-widest text-sm font-bold bg-slate-50 border-slate-300 py-2.5"
            />
            <p className="text-[11px] text-slate-500 mt-1">10-character alphanumeric PAN format</p>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <button
              type="button"
              className="btn-outline flex-1 justify-center py-2 text-xs"
              onClick={() => setShowPanModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-gold flex-1 justify-center py-2 text-xs font-semibold"
              disabled={!panInput || panInput.length < 10}
              onClick={() => {
                setShowPanModal(false);
                handleFinalize(panInput);
              }}
            >
              Confirm & Finalize
            </button>
          </div>
        </div>
      </Modal>

      {/* Estimate Success Modal */}
      {showEstimateSuccess && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto no-print animate-fade-in"
          style={{ pointerEvents: "auto" }}
          onClick={() => setShowEstimateSuccess(false)}
        >
          <div
            className="card p-7 my-auto flex flex-col items-center gap-4 animate-scale-in text-center max-w-md w-full bg-white shadow-2xl rounded-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-100 text-amber-700 shadow-inner">
              <Receipt size={30} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                Estimate Quotation Generated!
              </h3>
              <p className="text-base font-bold text-amber-700 font-mono mt-1">
                {createdEstimateNumber}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Gold rate locked for 7 days · Saved to PostgreSQL estimates register
              </p>
            </div>
            <div className="flex gap-3 w-full pt-2">
              <button
                className="btn-outline flex-1 justify-center py-2.5 text-xs font-semibold"
                onClick={() => setShowEstimateSuccess(false)}
              >
                Done
              </button>
              <button
                className="btn-gold flex-1 justify-center py-2.5 text-xs font-semibold shadow-md gap-2"
                onClick={() => {
                  setShowEstimateSuccess(false);
                  setShowPrintPreview(true);
                }}
              >
                <Printer size={15} /> Preview & Print
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Print Preview Modal */}
      <Modal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="Tax Invoice / Receipt Preview"
        icon={<FileText className="text-amber-600" size={20} />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Receipt Content Preview */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <PrintableInvoiceReceipt data={activePrintData} forceVisible />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              className="btn-outline text-xs px-4 py-2"
              onClick={() => setShowPrintPreview(false)}
            >
              Close Preview
            </button>
            <button
              type="button"
              className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5"
              onClick={() => window.print()}
            >
              <Printer size={14} /> Print Receipt (Ctrl+P)
            </button>
          </div>
        </div>
      </Modal>

      {/* Success overlay mounted directly to document.body to prevent parent container transform clipping */}
      {showSuccess && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto no-print animate-fade-in"
          style={{ pointerEvents: "auto" }}
        >
          <div className="card p-8 my-auto flex flex-col items-center gap-5 animate-scale-in text-center max-w-md w-full bg-white shadow-2xl rounded-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                Invoice Finalized!
              </h3>
              <p className="text-base font-bold text-amber-700 font-mono mt-1">
                {createdInvoiceNumber}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Saved to PostgreSQL · Stock SALE_OUT recorded · Journal posted
              </p>
            </div>
            <div className="flex gap-3 w-full pt-2">
              <button
                className="btn-outline flex-1 justify-center py-2.5 text-xs font-semibold"
                onClick={handleResetSale}
              >
                New Bill
              </button>
              <button
                className="btn-gold flex-1 justify-center py-2.5 text-xs font-semibold shadow-md gap-2"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Professional GST-compliant printable receipt template */}
      {activePrintData && <PrintableInvoiceReceipt data={activePrintData} />}
    </>
  );
}
