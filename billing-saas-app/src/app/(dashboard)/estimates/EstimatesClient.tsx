"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, X, Check, Eye,
  FileText, Clock, CheckCircle2, XCircle, ArrowRight,
  IndianRupee, Scale, Calendar, Send, Printer,
} from "lucide-react";
import { createEstimateAction, updateEstimateStatusAction } from "@/app/actions/estimates";
import { EstimateStatus } from "@prisma/client";

export interface EstimateItemRecord {
  id: string;
  name: string;
  weight: number;
  purity: string;
  rate: number;
  makingCharge: number;
  amount: number;
  quantity: number;
}

export interface EstimateRecord {
  id: string;
  estimateNumber: string;
  estimateDate: string;
  expiryDate: string;
  customer: string;
  phone: string;
  items: EstimateItemRecord[];
  grossAmount: number;
  discount: number;
  tax: number;
  netAmount: number;
  goldRateSnapshot: string;
  status: EstimateStatus;
  notes: string;
}

interface EstimatesClientProps {
  initialEstimates: EstimateRecord[];
  products: {
    id: string;
    name: string;
    sku: string;
    purity: string;
    grossWeight: number;
    netWeight: number;
    makingChargeValue: number;
  }[];
  customers: { id: string; name: string; phone: string }[];
  active22KRate: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_CONFIG: Record<EstimateStatus, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
  PENDING:   { label: "Pending",   bg: "#fffbeb", color: "#92400e", border: "#fde68a", icon: <Clock size={11} /> },
  APPROVED:  { label: "Approved",  bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe", icon: <CheckCircle2 size={11} /> },
  CONVERTED: { label: "Converted", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", icon: <ArrowRight size={11} /> },
  EXPIRED:   { label: "Expired",   bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", icon: <Clock size={11} /> },
  CANCELLED: { label: "Cancelled", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", icon: <XCircle size={11} /> },
};

export default function EstimatesClient({
  initialEstimates,
  products,
  customers,
  active22KRate,
}: EstimatesClientProps) {
  const [estimates, setEstimates] = useState<EstimateRecord[]>(initialEstimates);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "ALL">("ALL");
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // New estimate state
  const [selectedCustId, setSelectedCustId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || "");
  const [estimateCart, setEstimateCart] = useState<
    {
      productId: string;
      productName: string;
      grossWeight: number;
      netWeight: number;
      goldRatePerGram: number;
      makingCharge: number;
      stoneCharge: number;
      quantity: number;
    }[]
  >([]);

  const filtered = useMemo(() => {
    return estimates.filter((e) => {
      const matchSearch =
        searchQuery === "" ||
        e.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.estimateNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [estimates, searchQuery, statusFilter]);

  const totalValue = useMemo(() => estimates.reduce((s, e) => s + e.netAmount, 0), [estimates]);
  const pendingCount = useMemo(() => estimates.filter((e) => e.status === "PENDING").length, [estimates]);
  const convertedCount = useMemo(() => estimates.filter((e) => e.status === "CONVERTED").length, [estimates]);

  const handleAddItemToCart = () => {
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    setEstimateCart([
      ...estimateCart,
      {
        productId: prod.id,
        productName: prod.name,
        grossWeight: prod.grossWeight,
        netWeight: prod.netWeight,
        goldRatePerGram: active22KRate,
        makingCharge: Math.round(prod.netWeight * prod.makingChargeValue),
        stoneCharge: 0,
        quantity: 1,
      },
    ]);
  };

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estimateCart.length === 0) {
      setErrorMsg("Please add at least one jewellery article to the quotation.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const res = await createEstimateAction({
      customerId: selectedCustId || undefined,
      customerName: guestName || undefined,
      customerPhone: guestPhone || undefined,
      notes,
      discountAmount: parseFloat(discount) || 0,
      items: estimateCart,
    });

    setIsSubmitting(false);

    if (!res.success || !res.estimate) {
      setErrorMsg(res.error || "Failed to create estimate.");
      return;
    }

    const created = res.estimate;
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(created.estimateDate));

    const expStr = created.expiryDate
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(created.expiryDate))
      : "—";

    const newRecord: EstimateRecord = {
      id: created.id,
      estimateNumber: created.estimateNumber,
      estimateDate: dateStr,
      expiryDate: expStr,
      customer: created.customer?.name || guestName || "Walk-in Customer",
      phone: created.customer?.phone || guestPhone || "—",
      items: created.items.map((i: any) => ({
        id: i.id,
        name: i.productName,
        weight: Number(i.grossWeight),
        purity: "22K",
        rate: Number(i.goldRatePerGram),
        makingCharge: Number(i.makingCharge),
        amount: Number(i.totalAmount),
        quantity: i.quantity,
      })),
      grossAmount: Number(created.grossAmount),
      discount: Number(created.discountAmount),
      tax: Number(created.taxAmount),
      netAmount: Number(created.netAmount),
      goldRateSnapshot: `22K: ₹${active22KRate}/g`,
      status: created.status,
      notes: created.notes || "",
    };

    setEstimates([newRecord, ...estimates]);
    setShowAddModal(false);
    setEstimateCart([]);
    setGuestName("");
    setGuestPhone("");
    setNotes("");
    setDiscount("0");
  };

  const handleUpdateStatus = async (id: string, newStatus: EstimateStatus) => {
    const res = await updateEstimateStatusAction(id, newStatus);
    if (res.success) {
      setEstimates(
        estimates.map((est) => (est.id === id ? { ...est, status: newStatus } : est))
      );
      if (selectedEstimate && selectedEstimate.id === id) {
        setSelectedEstimate({ ...selectedEstimate, status: newStatus });
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Estimates & Quotations
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {estimates.length} estimates · Gold-rate-locked quotations for customers with Section 269ST compliance
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="new-estimate-btn"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} /> New Estimate
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Estimated",
            value: fmt(totalValue),
            sub: `${estimates.length} quotations`,
            icon: <FileText size={18} />,
            color: "#4f46e5",
            bg: "#eef2ff",
            border: "#c7d2fe",
          },
          {
            label: "Pending",
            value: pendingCount.toString(),
            sub: "Awaiting response",
            icon: <Clock size={18} />,
            color: "#b45309",
            bg: "#fffbeb",
            border: "#fde68a",
          },
          {
            label: "Converted",
            value: convertedCount.toString(),
            sub: "Became orders/sales",
            icon: <CheckCircle2 size={18} />,
            color: "#059669",
            bg: "#ecfdf5",
            border: "#a7f3d0",
          },
          {
            label: "Conversion Rate",
            value: `${estimates.length > 0 ? ((convertedCount / estimates.length) * 100).toFixed(0) : 0}%`,
            sub: "Estimate to order ratio",
            icon: <ArrowRight size={18} />,
            color: "#7c3aed",
            bg: "#f5f3ff",
            border: "#ddd6fe",
          },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className={`stat-card animate-fade-up stagger-${i + 1}`}
            style={{ padding: "1rem 1.25rem" }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center border"
              style={{ background: kpi.bg, color: kpi.color, borderColor: kpi.border }}
            >
              {kpi.icon}
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

      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="search-wrapper flex-1 min-w-[240px]">
            <Search size={16} className="search-icon-left" />
            <input
              type="text"
              placeholder="Search by customer name or estimate number..."
              className="input search-input text-xs pr-8 py-2 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="flex gap-2">
            {(["ALL", "PENDING", "APPROVED", "CONVERTED", "CANCELLED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                  statusFilter === s
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {s === "ALL" ? "All" : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estimate #</th>
                <th>Date</th>
                <th>Valid Until</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="text-right">Net Quote</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                filtered.map((est) => {
                  const cfg = STATUS_CONFIG[est.status];
                  return (
                    <tr key={est.id} className="hover:bg-slate-50 transition-colors">
                      <td className="font-mono text-xs font-bold text-amber-800">{est.estimateNumber}</td>
                      <td className="text-xs text-slate-600">{est.estimateDate}</td>
                      <td className="text-xs text-slate-500">{est.expiryDate}</td>
                      <td>
                        <p className="font-semibold text-xs text-slate-800">{est.customer}</p>
                        <p className="text-[10px] text-slate-400">{est.phone}</p>
                      </td>
                      <td className="text-xs text-slate-600 max-w-[200px] truncate">
                        {est.items.map((i) => i.name).join(", ")}
                      </td>
                      <td className="text-right font-bold text-xs text-slate-900">{fmt(est.netAmount)}</td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                          style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedEstimate(est)}
                          className="btn-ghost p-1.5 text-slate-600 hover:text-slate-900"
                          title="View Details & Print"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Estimate Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-box max-w-xl p-6 rounded-2xl animate-fade-up bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <FileText className="text-amber-600" size={18} />
                <h3 className="font-bold text-base text-slate-900">Create New Jewellery Estimate</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateEstimate} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Customer Selection</label>
                  <select
                    className="input text-xs w-full bg-white"
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                  >
                    <option value="">Walk-in / New Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                {!selectedCustId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Customer Name</label>
                      <input
                        className="input text-xs"
                        placeholder="Name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Mobile</label>
                      <input
                        className="input text-xs"
                        placeholder="Mobile"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Add item row */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <span className="font-bold text-amber-900 block">Add Jewellery Item</span>
                <div className="flex gap-2">
                  <select
                    className="input text-xs flex-1 bg-white"
                    value={selectedProdId}
                    onChange={(e) => setSelectedProdId(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.grossWeight.toFixed(2)}g - 22K)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="btn-gold text-xs px-3"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>

              {/* Cart items */}
              {estimateCart.length > 0 && (
                <div className="border rounded-xl p-3 space-y-2">
                  <span className="font-semibold text-slate-700 block">Quotation Items ({estimateCart.length})</span>
                  {estimateCart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.netWeight.toFixed(2)}g @ ₹{item.goldRatePerGram}/g + ₹{item.makingCharge} making
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {fmt((item.netWeight * item.goldRatePerGram + item.makingCharge) * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEstimateCart(estimateCart.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="input text-xs"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Notes / Terms</label>
                  <input
                    className="input text-xs"
                    placeholder="Rate validity 7 days"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline text-xs px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold text-xs px-4"
                >
                  {isSubmitting ? "Generating..." : "Generate Estimate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Estimate Details Modal */}
      {selectedEstimate && (
        <div className="modal-backdrop" onClick={() => setSelectedEstimate(null)}>
          <div
            className="modal-box max-w-lg p-6 rounded-2xl animate-fade-up bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{selectedEstimate.estimateNumber}</h3>
                <p className="text-[11px] text-slate-500">Issued: {selectedEstimate.estimateDate}</p>
              </div>
              <button onClick={() => setSelectedEstimate(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                <div>
                  <span className="text-[10px] text-slate-400 block">Customer</span>
                  <span className="font-bold text-slate-800">{selectedEstimate.customer}</span>
                  <span className="text-[11px] text-slate-500 block">{selectedEstimate.phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="badge badge-gold">{selectedEstimate.status}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">Items Quoted</span>
                {selectedEstimate.items.map((i) => (
                  <div key={i.id} className="p-2.5 rounded-lg border bg-white flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{i.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {i.weight}g · Rate: ₹{i.rate}/g · Making: ₹{i.makingCharge}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">{fmt(i.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Total</span>
                  <span className="font-semibold text-slate-800">{fmt(selectedEstimate.grossAmount)}</span>
                </div>
                {selectedEstimate.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>− {fmt(selectedEstimate.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">GST (3%)</span>
                  <span className="font-semibold text-slate-800">{fmt(selectedEstimate.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-amber-200">
                  <span>Net Estimated Quote</span>
                  <span>{fmt(selectedEstimate.netAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  {selectedEstimate.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedEstimate.id, "APPROVED")}
                        className="btn-gold text-xs px-3"
                      >
                        <Check size={12} /> Customer Approved
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedEstimate.id, "CANCELLED")}
                        className="btn-outline text-xs px-3 text-red-600 border-red-200"
                      >
                        Cancel Quote
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => window.print()}
                  className="btn-outline text-xs px-3 gap-1"
                >
                  <Printer size={13} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
