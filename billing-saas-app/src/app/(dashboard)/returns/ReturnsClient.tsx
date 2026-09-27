"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, X, Check, Eye,
  RefreshCw, ArrowRightLeft, IndianRupee,
  CheckCircle2, Clock, AlertCircle, Package,
  ShieldCheck, Scale, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  lookupSaleForReturnAction,
  processSaleReturnAction,
} from "@/app/actions/returns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReturnType = "RETURN" | "EXCHANGE";
export type ReturnStatus = "PENDING_INSPECTION" | "APPROVED" | "COMPLETED" | "REJECTED";

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  date: string;
  type: ReturnType;
  originalInvoice: string;
  customer: string;
  phone: string;
  returnedItem: string;
  returnedSku: string;
  returnedWeight: number;
  returnedPurity: string;
  refundAmount: number;
  refundMethod: string;
  newItem: string;
  newItemValue: number;
  differenceAmount: number;
  inspectionNotes: string;
  approvedBy: string;
  status: ReturnStatus;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_CONFIG: Record<
  ReturnStatus,
  { label: string; bg: string; color: string; border: string; icon: React.ReactNode }
> = {
  PENDING_INSPECTION: { label: "Pending",   bg: "#fffbeb", color: "#92400e", border: "#fde68a", icon: <Clock size={11} /> },
  APPROVED:           { label: "Approved",  bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe", icon: <CheckCircle2 size={11} /> },
  COMPLETED:          { label: "Completed", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", icon: <Check size={11} /> },
  REJECTED:           { label: "Rejected",  bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", icon: <X size={11} /> },
};

export default function ReturnsClient({
  initialReturns = [],
}: {
  initialReturns?: ReturnRecord[];
}) {
  const [returns, setReturns] = useState<ReturnRecord[]>(initialReturns);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReturnType | "ALL">("ALL");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        searchQuery === "" ||
        r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.originalInvoice.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === "ALL" || r.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [returns, searchQuery, typeFilter]);

  const totalRefunded = returns.reduce((s, r) => s + r.refundAmount, 0);
  const completedCount = returns.filter((r) => r.status === "COMPLETED").length;

  const handleReturnCreated = (newR: ReturnRecord) => {
    setReturns((prev) => [newR, ...prev]);
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
            Returns & Exchanges
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {returns.length} records · Restock inventory, credit notes & reverse accounting
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="new-return-btn"
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={14} /> New Return / Credit Note
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Returns",
            value: returns.length.toString(),
            sub: `${returns.filter((r) => r.type === "RETURN").length} returns · ${returns.filter((r) => r.type === "EXCHANGE").length} exchanges`,
            icon: <RefreshCw size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Total Refunded",
            value: fmt(totalRefunded),
            sub: "Cash, UPI & Credit Notes",
            icon: <IndianRupee size={18} />,
            color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
          },
          {
            label: "Completed",
            value: completedCount.toString(),
            sub: "Stock restored to inventory",
            icon: <CheckCircle2 size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Pending Inspection",
            value: returns.filter((r) => r.status === "PENDING_INSPECTION").length.toString(),
            sub: "Awaiting hallmark check",
            icon: <Clock size={18} />,
            color: "#d97706", bg: "#fffbeb", border: "#fde68a",
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

      {/* Search & Filter */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="search-wrapper flex-1 min-w-[220px]">
          <Search size={16} className="search-icon-left" />
          <input
            className="input search-input pr-9"
            placeholder="Search by return number, original invoice, or customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="returns-search"
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ReturnType | "ALL")}
            id="returns-filter-type"
          >
            <option value="ALL">All Types</option>
            <option value="RETURN">Return Only</option>
            <option value="EXCHANGE">Exchange</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Return #</th>
                <th>Date</th>
                <th>Type</th>
                <th>Original Invoice</th>
                <th>Customer</th>
                <th>Returned Item</th>
                <th>Weight</th>
                <th>Refund Amount</th>
                <th>Refund Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.COMPLETED;
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedReturn(r)}
                  >
                    <td>
                      <span className="text-xs font-bold text-amber-800">{r.returnNumber}</span>
                    </td>
                    <td><span className="text-xs font-medium text-slate-600">{r.date}</span></td>
                    <td>
                      <span className={`badge ${r.type === "RETURN" ? "badge-info" : "badge-gold"} text-[10px]`}>
                        {r.type === "RETURN" ? "Return" : "Exchange"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-700">{r.originalInvoice}</span>
                    </td>
                    <td>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{r.customer}</p>
                        <p className="text-[10px] text-slate-400">{r.phone}</p>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs font-semibold text-slate-800 truncate" style={{ maxWidth: 180 }}>
                        {r.returnedItem}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.returnedSku}</p>
                    </td>
                    <td><span className="text-xs font-medium text-slate-700">{r.returnedWeight.toFixed(2)}g</span></td>
                    <td>
                      {r.refundAmount > 0 ? (
                        <span className="text-sm font-bold text-red-600">{fmt(r.refundAmount)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td><span className="badge badge-neutral text-[10px]">{r.refundMethod}</span></td>
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

      {/* Slide-over Detail Panel */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50" style={{ pointerEvents: "auto" }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedReturn(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto animate-scale-in bg-white border-l border-slate-200 shadow-2xl">
            <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b bg-white">
              <div>
                <h3 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>Return Details</h3>
                <p className="text-xs font-bold text-amber-800 mt-0.5">{selectedReturn.returnNumber}</p>
              </div>
              <button className="btn-ghost p-2" onClick={() => setSelectedReturn(null)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Type", value: selectedReturn.type },
                  { label: "Date", value: selectedReturn.date },
                  { label: "Customer", value: selectedReturn.customer },
                  { label: "Original Invoice", value: selectedReturn.originalInvoice },
                  { label: "Returned Item", value: selectedReturn.returnedItem },
                  { label: "Returned Weight", value: `${selectedReturn.returnedWeight.toFixed(3)}g (${selectedReturn.returnedPurity})` },
                  { label: "Status", value: STATUS_CONFIG[selectedReturn.status]?.label || selectedReturn.status },
                  { label: "Approved By", value: selectedReturn.approvedBy || "Manager" },
                ].map((d) => (
                  <div key={d.label} className="rounded-xl p-3 border bg-slate-50 border-slate-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d.label}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>
              {selectedReturn.refundAmount > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 border bg-red-50 border-red-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Refund Amount</p>
                    <p className="text-lg font-extrabold text-red-700" style={{ fontFamily: "var(--font-display)" }}>
                      {fmt(selectedReturn.refundAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl p-3 border bg-slate-50 border-slate-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Refund Method</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReturn.refundMethod}</p>
                  </div>
                </div>
              )}
              {selectedReturn.inspectionNotes && (
                <div className="rounded-xl p-3 border bg-slate-50 border-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Inspection Notes</p>
                  <p className="text-xs font-medium text-slate-600">{selectedReturn.inspectionNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Return Modal */}
      {showNewModal && (
        <NewReturnModal
          onClose={() => setShowNewModal(false)}
          onSuccess={handleReturnCreated}
        />
      )}
    </div>
  );
}

// ─── New Return Modal Component ───────────────────────────────────────────────

function NewReturnModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (rec: ReturnRecord) => void;
}) {
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saleData, setSaleData] = useState<any>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "UPI" | "CREDIT_NOTE">("CREDIT_NOTE");
  const [reason, setReason] = useState("Defect / Sizing issue");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLookup = async () => {
    if (!invoiceQuery.trim()) return;
    setSearching(true);
    setErrorMsg("");
    try {
      const data = await lookupSaleForReturnAction(invoiceQuery);
      if (!data) {
        setErrorMsg("Invoice not found. Please verify the invoice number.");
      } else {
        setSaleData(data);
        if (data.items.length > 0) {
          setSelectedItemId(data.items[0].saleItemId);
          setRefundAmount(data.items[0].totalCost.toString());
        }
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Error querying invoice");
    } finally {
      setSearching(false);
    }
  };

  const selectedItem = saleData?.items?.find((i: any) => i.saleItemId === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleData || !selectedItem) {
      setErrorMsg("Please look up a valid invoice and select an item.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await processSaleReturnAction({
        saleId: saleData.id,
        items: [
          {
            saleItemId: selectedItemId,
            quantity: parseInt(quantity, 10) || 1,
          },
        ],
        refundAmount: parseFloat(refundAmount) || selectedItem.totalCost,
        refundMethod,
        reason: `${reason}${notes ? " — " + notes : ""}`,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to process return.");
      } else {
        const newRecord: ReturnRecord = {
          id: res.returnId!,
          returnNumber: res.creditNoteNumber || `RET-${res.returnId!.slice(-6)}`,
          date: "Today",
          type: "RETURN",
          originalInvoice: saleData.invoiceNumber,
          customer: saleData.customerName,
          phone: saleData.customerPhone,
          returnedItem: selectedItem.productName,
          returnedSku: selectedItem.sku,
          returnedWeight: selectedItem.grossWeight,
          returnedPurity: selectedItem.purity,
          refundAmount: parseFloat(refundAmount) || selectedItem.totalCost,
          refundMethod,
          newItem: "",
          newItemValue: 0,
          differenceAmount: -(parseFloat(refundAmount) || selectedItem.totalCost),
          inspectionNotes: reason,
          approvedBy: "Manager",
          status: "COMPLETED",
        };
        onSuccess(newRecord);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process return.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: "auto" }}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 card p-0 overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b bg-amber-50/60 border-amber-200">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-amber-700" />
            <h3 className="font-bold text-sm text-amber-900" style={{ fontFamily: "var(--font-display)" }}>
              Process Sales Return & Credit Note
            </h3>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Lookup Original Invoice #</label>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase"
                placeholder="e.g. INV-2026-001"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
              />
              <button
                type="button"
                className="btn-gold shrink-0 text-xs px-3"
                disabled={searching}
                onClick={handleLookup}
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
          </div>

          {saleData && (
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">{saleData.customerName}</p>
                  <p className="text-[10px] text-slate-400">{saleData.invoiceNumber} · {saleData.customerPhone}</p>
                </div>
                <span className="badge badge-success text-xs font-bold">{fmt(saleData.totalNetAmount)}</span>
              </div>

              <div>
                <label className="input-label">Select Item to Return</label>
                <select
                  className="input text-xs"
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const it = saleData.items.find((x: any) => x.saleItemId === e.target.value);
                    if (it) setRefundAmount(it.totalCost.toString());
                  }}
                >
                  {saleData.items.map((it: any) => (
                    <option key={it.saleItemId} value={it.saleItemId}>
                      {it.productName} ({it.sku}) — {it.grossWeight}g — {fmt(it.totalCost)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">Return Qty</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max={selectedItem?.quantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">Refund Amount (₹)</label>
                  <input
                    className="input font-bold text-red-700"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Refund Settlement Method</label>
            <select
              className="input"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as any)}
            >
              <option value="CREDIT_NOTE">Credit Note (Store Credit)</option>
              <option value="CASH">Cash Refund</option>
              <option value="UPI">UPI Refund</option>
            </select>
          </div>

          <div>
            <label className="input-label">Reason for Return</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Defect / Sizing issue">Defect / Sizing issue</option>
              <option value="Customer Dissatisfaction">Customer Dissatisfaction</option>
              <option value="Exchange for Alternative">Exchange for Alternative</option>
              <option value="Billing Discrepancy">Billing Discrepancy</option>
            </select>
          </div>

          <div>
            <label className="input-label">Inspection & Restock Notes</label>
            <input
              className="input"
              placeholder="Hallmark seal intact, weight verified on scale…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            <button
              type="submit"
              className="btn-gold flex-1 justify-center"
              disabled={submitting || !saleData}
            >
              {submitting ? "Processing Return…" : "Approve & Restock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
