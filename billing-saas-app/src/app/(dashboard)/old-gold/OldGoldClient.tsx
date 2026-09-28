"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, X, Check, Eye,
  Scale, IndianRupee, ArrowUpRight, ArrowDownRight,
  FileText, User, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, Package, Gem, Percent, AlertCircle,
} from "lucide-react";
import { recordOldGoldAction } from "@/app/actions/old-gold";
import { OldGoldType } from "@prisma/client";
import Modal from "@/components/Modal";
import SlideOver from "@/components/SlideOver";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OldGoldStatus = "PENDING_APPROVAL" | "APPROVED" | "SETTLED" | "REJECTED";

export interface OldGoldRecord {
  id: string;
  date: string;
  type: OldGoldType;
  customerId?: string;
  customer: string;
  phone: string;
  purity: string;
  testedFineness: number;
  grossWeight: number;
  deductions: number;
  netWeight: number;
  pureGoldEquiv: number;
  buyingRate: number;
  valuationAmount: number;
  linkedInvoice: string;
  status: OldGoldStatus;
  approvedBy: string;
  notes: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_CONFIG: Record<OldGoldStatus, { label: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
  PENDING_APPROVAL: { label: "Pending",  icon: <Clock size={11} />,        bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  APPROVED:         { label: "Approved", icon: <CheckCircle2 size={11} />, bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  SETTLED:          { label: "Settled",  icon: <Check size={11} />,        bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  REJECTED:         { label: "Rejected", icon: <AlertTriangle size={11} />, bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

export default function OldGoldClient({
  initialRecords = [],
  customers = [],
  currentBuyingRate24K = 6120,
}: {
  initialRecords?: OldGoldRecord[];
  customers?: CustomerOption[];
  currentBuyingRate24K?: number;
}) {
  const [records, setRecords] = useState<OldGoldRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<OldGoldType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<OldGoldStatus | "ALL">("ALL");
  const [selectedRecord, setSelectedRecord] = useState<OldGoldRecord | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        searchQuery === "" ||
        r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phone.includes(searchQuery) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === "ALL" || r.type === typeFilter;
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [records, searchQuery, typeFilter, statusFilter]);

  const totalValuation = records.reduce((s, r) => s + r.valuationAmount, 0);
  const totalPureGold = records.reduce((s, r) => s + r.pureGoldEquiv, 0);
  const settledCount = records.filter((r) => r.status === "SETTLED").length;
  const pendingCount = records.filter((r) => r.status === "PENDING_APPROVAL").length;

  const handleRecordCreated = (newR: OldGoldRecord) => {
    setRecords((prev) => [newR, ...prev]);
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
            Old Gold Assaying & Valuation
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {records.length} transactions · Exchange credits, cash purchases & pure gold calculation
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="new-old-gold-btn"
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={14} /> New Old Gold Entry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Valuation",
            value: fmt(totalValuation),
            sub: `${records.length} transactions`,
            icon: <IndianRupee size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Pure Gold Received",
            value: `${totalPureGold.toFixed(2)}g`,
            sub: "24K equivalent weight",
            icon: <Scale size={18} />,
            color: "#b45309", bg: "#fffbeb", border: "#fde68a",
          },
          {
            label: "Settled / Invoiced",
            value: settledCount.toString(),
            sub: "Applied to bills",
            icon: <CheckCircle2 size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Pending Approval",
            value: pendingCount.toString(),
            sub: "Manager review needed",
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
            placeholder="Search by customer name, phone or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="og-search"
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
            onChange={(e) => setTypeFilter(e.target.value as OldGoldType | "ALL")}
            id="og-filter-type"
          >
            <option value="ALL">All Types</option>
            <option value="EXCHANGE">Exchange</option>
            <option value="CASH_PURCHASE">Cash Purchase</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
        <div className="relative">
          <select
            className="input pr-8 appearance-none cursor-pointer"
            style={{ minWidth: 140 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OldGoldStatus | "ALL")}
            id="og-filter-status"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
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
                <th>ID / Date</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Purity / Fineness</th>
                <th>Gross Wt</th>
                <th>Deductions</th>
                <th>Net Wt</th>
                <th>Pure Gold Eq</th>
                <th>Valuation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.APPROVED;
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedRecord(r)}
                  >
                    <td>
                      <div>
                        <p className="text-xs font-bold text-amber-800">{r.id.slice(-8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400">{r.date}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${r.type === "EXCHANGE" ? "badge-gold" : "badge-info"} text-[10px]`}>
                        {r.type === "EXCHANGE" ? "Exchange" : "Cash Purchase"}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{r.customer}</p>
                        <p className="text-[10px] text-slate-400">{r.phone}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="badge badge-gold text-[10px]">{r.purity}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{(r.testedFineness * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td><span className="text-xs font-semibold text-slate-700">{r.grossWeight.toFixed(3)}g</span></td>
                    <td><span className="text-xs text-red-600 font-medium">−{r.deductions.toFixed(3)}g</span></td>
                    <td><span className="text-xs font-bold text-slate-800">{r.netWeight.toFixed(3)}g</span></td>
                    <td><span className="text-xs font-bold text-amber-700">{r.pureGoldEquiv.toFixed(3)}g</span></td>
                    <td><span className="text-sm font-bold text-gold">{fmt(r.valuationAmount)}</span></td>
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
      <SlideOver
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Old Gold Valuation Details"
        subtitle={selectedRecord ? selectedRecord.id.slice(-8).toUpperCase() : ""}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Customer", value: selectedRecord.customer },
                { label: "Phone", value: selectedRecord.phone },
                { label: "Date", value: selectedRecord.date },
                { label: "Type", value: selectedRecord.type },
                { label: "Tested Fineness", value: `${(selectedRecord.testedFineness * 100).toFixed(2)}%` },
                { label: "Pure Gold Equiv", value: `${selectedRecord.pureGoldEquiv.toFixed(3)}g` },
                { label: "Buying Rate", value: `₹${selectedRecord.buyingRate}/g` },
                { label: "Valuation", value: fmt(selectedRecord.valuationAmount) },
              ].map((d) => (
                <div key={d.label} className="rounded-xl p-3 border bg-slate-50 border-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d.label}</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>
            {selectedRecord.notes && (
              <div className="rounded-xl p-3 border bg-slate-50 border-slate-200">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                <p className="text-xs font-medium text-slate-600">{selectedRecord.notes}</p>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* New Old Gold Modal */}
      {showNewModal && (
        <NewOldGoldModal
          customers={customers}
          defaultRate24K={currentBuyingRate24K}
          onClose={() => setShowNewModal(false)}
          onSuccess={handleRecordCreated}
        />
      )}
    </div>
  );
}

// ─── New Old Gold Modal Component ─────────────────────────────────────────────

function NewOldGoldModal({
  customers,
  defaultRate24K,
  onClose,
  onSuccess,
}: {
  customers: CustomerOption[];
  defaultRate24K: number;
  onClose: () => void;
  onSuccess: (record: OldGoldRecord) => void;
}) {
  const [txnType, setTxnType] = useState<OldGoldType>(OldGoldType.EXCHANGE);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [purity, setPurity] = useState("22K");
  const [testedFineness, setTestedFineness] = useState("91.66");
  const [grossWeight, setGrossWeight] = useState("10.0");
  const [deductions, setDeductions] = useState("0.2");
  const [buyingRate, setBuyingRate] = useState(defaultRate24K.toString());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const netWeight = Math.max(0, (parseFloat(grossWeight) || 0) - (parseFloat(deductions) || 0));
  const finenessDecimal = (parseFloat(testedFineness) || 91.66) / 100;
  const meltingDeduction = 0.02; // 2%
  const effectiveFineness = Math.max(0, finenessDecimal * (1 - meltingDeduction));
  const pureGoldEquiv = Math.round(netWeight * effectiveFineness * 1000) / 1000;
  const valuation = Math.round(pureGoldEquiv * (parseFloat(buyingRate) || defaultRate24K));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName && !customerId) {
      setErrorMsg("Please specify customer name or select a customer.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await recordOldGoldAction({
        customerId: customerId || undefined,
        type: txnType,
        purityName: purity,
        testedFineness: finenessDecimal,
        grossWeight: parseFloat(grossWeight) || 0,
        stoneWeight: parseFloat(deductions) || 0,
        meltingDeductionPercent: 2.0,
        buyingRate24K: parseFloat(buyingRate) || defaultRate24K,
        notes: `${notes ? notes + " · " : ""}Customer: ${customerName || "Customer"} (${phone})`,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to record old gold transaction.");
      } else {
        const newRecord: OldGoldRecord = {
          id: res.transactionId!,
          date: "Today",
          type: txnType,
          customerId,
          customer: customerName || "Customer",
          phone,
          purity,
          testedFineness: finenessDecimal,
          grossWeight: parseFloat(grossWeight) || 0,
          deductions: parseFloat(deductions) || 0,
          netWeight,
          pureGoldEquiv,
          buyingRate: parseFloat(buyingRate) || defaultRate24K,
          valuationAmount: res.valuationAmount || valuation,
          linkedInvoice: "",
          status: "APPROVED",
          approvedBy: "Manager",
          notes,
        };
        onSuccess(newRecord);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="New Old Gold Assaying & Valuation"
      icon={<Scale size={18} className="text-amber-700" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Transaction Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all"
                style={{
                  background: txnType === OldGoldType.EXCHANGE ? "#fffbeb" : "#fff",
                  color: txnType === OldGoldType.EXCHANGE ? "#92400e" : "#64748b",
                  borderColor: txnType === OldGoldType.EXCHANGE ? "#fde68a" : "#e2e8f0",
                }}
                onClick={() => setTxnType(OldGoldType.EXCHANGE)}
              >
                <Gem size={14} /> Exchange Credit (Sale)
              </button>
              <button
                type="button"
                className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all"
                style={{
                  background: txnType === OldGoldType.CASH_PURCHASE ? "#fffbeb" : "#fff",
                  color: txnType === OldGoldType.CASH_PURCHASE ? "#92400e" : "#64748b",
                  borderColor: txnType === OldGoldType.CASH_PURCHASE ? "#fde68a" : "#e2e8f0",
                }}
                onClick={() => setTxnType(OldGoldType.CASH_PURCHASE)}
              >
                <IndianRupee size={14} /> Outright Cash Purchase
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="input-label">Select Registered Customer</label>
              <select
                className="input"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const c = customers.find((cust) => cust.id === e.target.value);
                  if (c) {
                    setCustomerName(c.name);
                    setPhone(c.phone);
                  }
                }}
              >
                <option value="">Or enter new customer below…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Customer Name *</label>
              <input
                className="input"
                placeholder="e.g. Priya Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Phone Number *</label>
              <input
                className="input"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">Purity Grade</label>
              <select
                className="input"
                value={purity}
                onChange={(e) => {
                  setPurity(e.target.value);
                  if (e.target.value === "22K") setTestedFineness("91.66");
                  if (e.target.value === "18K") setTestedFineness("75.00");
                  if (e.target.value === "24K") setTestedFineness("99.90");
                }}
              >
                <option value="22K">22K Gold (916)</option>
                <option value="18K">18K Gold (750)</option>
                <option value="24K">24K Pure Gold (999)</option>
                <option value="14K">14K Gold (585)</option>
              </select>
            </div>
            <div>
              <label className="input-label">Tested Fineness (%)</label>
              <input
                className="input font-mono"
                type="number"
                step="0.01"
                value={testedFineness}
                onChange={(e) => setTestedFineness(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">Gross Weight (g) *</label>
              <input
                className="input"
                type="number"
                step="0.001"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Stone / Wax Deduction (g)</label>
              <input
                className="input"
                type="number"
                step="0.001"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="input-label">24K Buying Benchmark Rate (₹/g)</label>
              <input
                className="input font-bold text-amber-800"
                type="number"
                value={buyingRate}
                onChange={(e) => setBuyingRate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dynamic Assaying Breakdown */}
          <div className="p-3 rounded-xl border bg-amber-50/50 border-amber-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Net Metal Weight:</span>
              <strong className="text-slate-800">{netWeight.toFixed(3)}g</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Pure Gold Equivalent (after 2% melting margin):</span>
              <strong className="text-amber-800">{pureGoldEquiv.toFixed(3)}g</strong>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-amber-200 font-bold text-slate-900">
              <span>Calculated Valuation:</span>
              <span className="text-amber-700 font-extrabold">{fmt(valuation)}</span>
            </div>
          </div>

          <div>
            <label className="input-label">Notes & Observations</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Item condition, hallmark seals, acid assay notes…"
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
            <button type="submit" className="btn-gold flex-1 justify-center" disabled={submitting}>
              {submitting ? "Appraising…" : "Submit & Update Ledger"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
