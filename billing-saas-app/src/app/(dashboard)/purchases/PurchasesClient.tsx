"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, X, Check, Eye,
  Truck, Package, Scale, IndianRupee, Calendar,
  ArrowUpRight, ArrowDownRight, FileText,
  CheckCircle2, Clock, AlertCircle, XCircle,
  TrendingUp, CreditCard,
} from "lucide-react";
import {
  recordPurchaseInwardAction,
  recordSupplierPaymentAction,
} from "@/app/actions/purchases";
import { PaymentMethod } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseStatusType = "DRAFT" | "COMPLETED" | "PARTIALLY_RETURNED" | "RETURNED";

export interface PurchaseItemData {
  name: string;
  sku: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  totalCost: number;
  purity: string;
}

export interface PurchaseData {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: string;
  supplier: string;
  supplierPhone: string;
  branch: string;
  items: PurchaseItemData[];
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  amountPaid: number;
  amountDue: number;
  status: PurchaseStatusType;
  notes: string;
}

export interface SupplierOption {
  id: string;
  name: string;
  phone: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  grossWeight: number;
  netWeight: number;
  purity: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_CONFIG: Record<PurchaseStatusType, { label: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
  DRAFT:              { label: "Draft",              icon: <Clock size={11} />,        bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  COMPLETED:          { label: "Completed",          icon: <CheckCircle2 size={11} />, bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  PARTIALLY_RETURNED: { label: "Partial Return",     icon: <AlertCircle size={11} />,  bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  RETURNED:           { label: "Returned",           icon: <XCircle size={11} />,      bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

export default function PurchasesClient({
  initialPurchases = [],
  suppliers = [],
  products = [],
}: {
  initialPurchases?: PurchaseData[];
  suppliers?: SupplierOption[];
  products?: ProductOption[];
}) {
  const [purchases, setPurchases] = useState<PurchaseData[]>(initialPurchases);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatusType | "ALL">("ALL");
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseData | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const matchSearch =
        searchQuery === "" ||
        p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  const totalValue = purchases.reduce((s, p) => s + p.netAmount, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.amountPaid, 0);
  const totalDue = purchases.reduce((s, p) => s + p.amountDue, 0);
  const totalItemsBought = purchases.reduce((s, p) => s + p.items.reduce((a, i) => a + i.quantity, 0), 0);

  const handlePurchaseCreated = (newP: PurchaseData) => {
    setPurchases((prev) => [newP, ...prev]);
  };

  const handlePaymentRecorded = (purchaseId: string, amount: number) => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        const newPaid = p.amountPaid + amount;
        const newDue = Math.max(0, p.amountDue - amount);
        return { ...p, amountPaid: newPaid, amountDue: newDue };
      })
    );
    if (selectedPurchase && selectedPurchase.id === purchaseId) {
      setSelectedPurchase((prev) =>
        prev
          ? {
              ...prev,
              amountPaid: prev.amountPaid + amount,
              amountDue: Math.max(0, prev.amountDue - amount),
            }
          : null
      );
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Purchases & Inwarding
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {purchases.length} purchase orders · Live supplier inwarding, payments & inventory sync
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="new-purchase-btn"
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={14} /> New Purchase Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Purchase Value",
            value: fmt(totalValue),
            sub: `${purchases.length} orders recorded`,
            icon: <TrendingUp size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Items Purchased",
            value: totalItemsBought.toString(),
            sub: "Total jewellery units",
            icon: <Package size={18} />,
            color: "#b45309", bg: "#fffbeb", border: "#fde68a",
          },
          {
            label: "Total Settled",
            value: fmt(totalPaid),
            sub: "Paid to suppliers",
            icon: <IndianRupee size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Outstanding Due",
            value: fmt(totalDue),
            sub: `${purchases.filter((p) => p.amountDue > 0).length} pending payments`,
            icon: <AlertCircle size={18} />,
            color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
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
              <p className="text-xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                {kpi.value}
              </p>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{kpi.label}</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="search-wrapper flex-1 min-w-[220px]">
          <Search size={16} className="search-icon-left" />
          <input
            className="input search-input pr-9"
            placeholder="Search by purchase number or supplier…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="purchases-search"
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
            onChange={(e) => setStatusFilter(e.target.value as PurchaseStatusType | "ALL")}
            id="purchases-filter-status"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* Purchase Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Purchase #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Gross Amount</th>
                <th>Tax (GST)</th>
                <th>Net Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = STATUS_CONFIG[p.status];
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedPurchase(p)}
                  >
                    <td>
                      <span className="text-xs font-bold" style={{ color: "#b45309" }}>{p.purchaseNumber}</span>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-slate-600">{p.purchaseDate}</span>
                    </td>
                    <td>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{p.supplier}</p>
                        <p className="text-[10px] text-slate-400">{p.supplierPhone}</p>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info text-[11px]">
                        {p.items.reduce((a, i) => a + i.quantity, 0)} items
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-700">{fmt(p.grossAmount)}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">{fmt(p.taxAmount)}</span>
                    </td>
                    <td>
                      <span className="text-sm font-bold text-gold">{fmt(p.netAmount)}</span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold" style={{ color: "#059669" }}>{fmt(p.amountPaid)}</span>
                    </td>
                    <td>
                      {p.amountDue > 0 ? (
                        <span className="badge badge-danger text-xs font-bold">{fmt(p.amountDue)}</span>
                      ) : (
                        <span className="badge badge-success text-[10px]">Settled</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge text-[10px] flex items-center gap-1 w-fit"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Detail Panel */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50" style={{ pointerEvents: "auto" }}>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedPurchase(null)}
          />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto animate-scale-in"
            style={{
              background: "var(--bg-surface)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-20px 0 60px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <div>
                <h3 className="font-bold text-base" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Purchase Details
                </h3>
                <p className="text-xs font-bold mt-0.5" style={{ color: "#b45309" }}>{selectedPurchase.purchaseNumber}</p>
              </div>
              <button className="btn-ghost p-2" onClick={() => setSelectedPurchase(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Date", value: selectedPurchase.purchaseDate },
                  { label: "Supplier", value: selectedPurchase.supplier },
                  { label: "Branch", value: selectedPurchase.branch },
                  { label: "Status", value: STATUS_CONFIG[selectedPurchase.status].label },
                ].map((d) => (
                  <div key={d.label} className="rounded-xl p-3 border" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d.label}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <h4 className="section-title mb-3 flex items-center gap-2">
                  <Package size={16} style={{ color: "var(--gold-500)" }} />
                  Purchase Items & Inward Weights
                </h4>
                <div className="space-y-2">
                  {selectedPurchase.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between"
                      style={{ borderColor: "#e2e8f0" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-info text-[10px]">{item.sku}</span>
                          {item.purity !== "N/A" && <span className="badge badge-gold text-[10px]">{item.purity}</span>}
                        </div>
                        <div className="flex gap-4 mt-1.5 text-[10px] text-slate-400">
                          <span>Qty: <strong className="text-slate-600">{item.quantity}</strong></span>
                          <span>Gross: <strong className="text-slate-600">{item.grossWeight.toFixed(1)}g</strong></span>
                          <span>Net: <strong className="text-slate-600">{item.netWeight.toFixed(1)}g</strong></span>
                          {item.ratePerGram > 0 && <span>Rate: <strong className="text-slate-600">₹{item.ratePerGram}/g</strong></span>}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gold shrink-0 ml-3">{fmt(item.totalCost)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="section-title flex items-center gap-2">
                    <IndianRupee size={16} style={{ color: "var(--gold-500)" }} />
                    Payables & Settlement
                  </h4>
                  {selectedPurchase.amountDue > 0 && (
                    <button
                      className="btn-gold text-xs py-1 px-3"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      <CreditCard size={13} /> Pay Supplier
                    </button>
                  )}
                </div>
                <div className="space-y-2 rounded-xl border p-4" style={{ borderColor: "#e2e8f0" }}>
                  {[
                    { label: "Gross Amount", value: fmt(selectedPurchase.grossAmount) },
                    { label: "Tax (3% GST)", value: fmt(selectedPurchase.taxAmount) },
                    { label: "Net Payable", value: fmt(selectedPurchase.netAmount), bold: true },
                    { label: "Amount Paid", value: fmt(selectedPurchase.amountPaid), color: "#059669" },
                    { label: "Amount Due", value: fmt(selectedPurchase.amountDue), color: selectedPurchase.amountDue > 0 ? "#dc2626" : "#059669" },
                  ].map((row) => (
                    <div key={row.label} className={`flex justify-between items-center ${row.bold ? "pt-2 border-t border-slate-100" : ""}`}>
                      <span className={`text-xs ${row.bold ? "font-bold text-slate-800" : "text-slate-500 font-medium"}`}>{row.label}</span>
                      <span
                        className={`text-sm ${row.bold ? "font-extrabold" : "font-bold"}`}
                        style={{ color: row.color || "var(--text-primary)", fontFamily: row.bold ? "var(--font-display)" : undefined }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedPurchase.notes && (
                <div className="rounded-xl p-3 border" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes & References</p>
                  <p className="text-xs text-slate-600 font-medium">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Modal */}
      {showNewModal && (
        <NewPurchaseModal
          suppliers={suppliers}
          products={products}
          onClose={() => setShowNewModal(false)}
          onSuccess={handlePurchaseCreated}
        />
      )}

      {/* Supplier Payment Modal */}
      {showPaymentModal && selectedPurchase && (
        <SupplierPaymentModal
          purchase={selectedPurchase}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(amt) => handlePaymentRecorded(selectedPurchase.id, amt)}
        />
      )}
    </div>
  );
}

// ─── New Purchase Modal Component ─────────────────────────────────────────────

function NewPurchaseModal({
  suppliers,
  products,
  onClose,
  onSuccess,
}: {
  suppliers: SupplierOption[];
  products: ProductOption[];
  onClose: () => void;
  onSuccess: (purchase: PurchaseData) => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [ratePerGram, setRatePerGram] = useState("6120");
  const [grossWeight, setGrossWeight] = useState("10.0");
  const [netWeight, setNetWeight] = useState("10.0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const chosenProduct = products.find((p) => p.id === selectedProductId);

  const calculatedCost = useMemo(() => {
    const nw = parseFloat(netWeight) || 0;
    const rate = parseFloat(ratePerGram) || 0;
    return Math.round(nw * rate);
  }, [netWeight, ratePerGram]);

  const taxAmount = Math.round(calculatedCost * 0.03);
  const netAmount = calculatedCost + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !selectedProductId) {
      setErrorMessage("Please select both a supplier and a product.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");

    try {
      const qtyNum = parseInt(quantity, 10) || 1;
      const gwNum = parseFloat(grossWeight) || 10;
      const nwNum = parseFloat(netWeight) || 10;
      const rateNum = parseFloat(ratePerGram) || 6120;
      const paidNum = parseFloat(amountPaid) || 0;

      const res = await recordPurchaseInwardAction({
        supplierId,
        items: [
          {
            productId: selectedProductId,
            quantity: qtyNum,
            grossWeight: gwNum,
            stoneWeight: Math.max(0, gwNum - nwNum),
            netWeight: nwNum,
            ratePerGram: rateNum,
            totalCost: calculatedCost,
          },
        ],
        taxAmount,
        amountPaid: paidNum,
        paymentMethod,
        notes,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to record purchase.");
      } else {
        const sup = suppliers.find((s) => s.id === supplierId);
        const newRecord: PurchaseData = {
          id: res.purchaseId!,
          purchaseNumber: res.purchaseNumber!,
          purchaseDate: "Today",
          supplierId,
          supplier: sup?.name || "Supplier",
          supplierPhone: sup?.phone || "",
          branch: "Main Branch",
          items: [
            {
              name: chosenProduct?.name || "Jewellery Item",
              sku: chosenProduct?.sku || "SKU",
              quantity: qtyNum,
              grossWeight: gwNum,
              netWeight: nwNum,
              ratePerGram: rateNum,
              totalCost: calculatedCost,
              purity: chosenProduct?.purity || "22K",
            },
          ],
          grossAmount: calculatedCost,
          taxAmount,
          netAmount,
          amountPaid: paidNum,
          amountDue: Math.max(0, netAmount - paidNum),
          status: "COMPLETED",
          notes,
        };
        onSuccess(newRecord);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to record purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: "auto" }}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 card p-0 overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 flex items-center justify-between border-b bg-amber-50/60 border-amber-200">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-amber-700" />
            <h3 className="font-bold text-sm text-amber-900" style={{ fontFamily: "var(--font-display)" }}>
              New Purchase Inward (Goods Receipt)
            </h3>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Supplier *</label>
            <select
              className="input"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              id="purchase-supplier-select"
            >
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Product to Inward *</label>
            <select
              className="input"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((prod) => prod.id === e.target.value);
                if (p) {
                  setGrossWeight(p.grossWeight.toString());
                  setNetWeight(p.netWeight.toString());
                }
              }}
              required
              id="purchase-product-select"
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {p.purity}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="input-label">Qty (pcs)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                id="purchase-qty"
              />
            </div>
            <div>
              <label className="input-label">Gross Wt (g)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                required
                id="purchase-gross-weight"
              />
            </div>
            <div>
              <label className="input-label">Net Wt (g)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
                required
                id="purchase-net-weight"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="input-label">Purchase Rate (₹/g)</label>
              <input
                className="input"
                type="number"
                value={ratePerGram}
                onChange={(e) => setRatePerGram(e.target.value)}
                required
                id="purchase-rate"
              />
            </div>
            <div>
              <label className="input-label">Amount Paid Now (₹)</label>
              <input
                className="input"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                id="purchase-paid"
              />
            </div>
          </div>

          {/* Pricing summary */}
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Gross Metal Cost:</span>
              <strong className="text-slate-800">{fmt(calculatedCost)}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (3%):</span>
              <strong className="text-slate-800">{fmt(taxAmount)}</strong>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-slate-200 text-slate-800 font-bold">
              <span>Net Order Amount:</span>
              <span className="text-amber-700">{fmt(netAmount)}</span>
            </div>
          </div>

          <div>
            <label className="input-label">Payment Method</label>
            <select
              className="input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit (Full Due)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Notes</label>
            <input
              className="input"
              placeholder="Delivery challan / invoice notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl border flex items-start gap-2 bg-red-50 border-red-200">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
              <p className="text-xs font-medium text-red-700">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-outline flex-1 justify-center" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-gold flex-1 justify-center" disabled={submitting}>
              {submitting ? "Processing…" : "Inward & Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Supplier Payment Modal Component ─────────────────────────────────────────

function SupplierPaymentModal({
  purchase,
  onClose,
  onSuccess,
}: {
  purchase: PurchaseData;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(purchase.amountDue.toString());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > purchase.amountDue) {
      setErrorMsg(`Please enter a valid amount up to ${fmt(purchase.amountDue)}`);
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await recordSupplierPaymentAction({
        purchaseId: purchase.id,
        amount: amt,
        paymentMethod: method,
        reference,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Payment recording failed.");
      } else {
        onSuccess(amt);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: "auto" }}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 card p-0 overflow-hidden shadow-2xl animate-scale-in">
        <div className="px-6 py-4 flex items-center justify-between border-b bg-emerald-50/60 border-emerald-200">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-700" />
            <h3 className="font-bold text-sm text-emerald-900" style={{ fontFamily: "var(--font-display)" }}>
              Pay Supplier
            </h3>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handlePay} className="p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Paying Supplier:</p>
            <p className="text-sm font-bold text-slate-800">{purchase.supplier}</p>
            <p className="text-[11px] text-amber-700 font-bold mt-0.5">PO: {purchase.purchaseNumber}</p>
          </div>

          <div>
            <label className="input-label">Payment Amount (₹) *</label>
            <input
              className="input font-bold text-emerald-800"
              type="number"
              max={purchase.amountDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">Outstanding: {fmt(purchase.amountDue)}</p>
          </div>

          <div>
            <label className="input-label">Payment Method</label>
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="input-label">Reference / UTR / Cheque #</label>
            <input
              className="input"
              placeholder="e.g. UTR-9821038"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl border flex items-start gap-2 bg-red-50 border-red-200">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
              <p className="text-xs font-medium text-red-700">{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-outline flex-1 justify-center" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-gold flex-1 justify-center" disabled={submitting}>
              {submitting ? "Settling…" : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
