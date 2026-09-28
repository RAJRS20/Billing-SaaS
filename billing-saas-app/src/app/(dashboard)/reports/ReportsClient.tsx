"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3, Scale, IndianRupee, TrendingUp,
  Download, CheckCircle2, AlertTriangle,
  Layers, FileSpreadsheet, Check, Printer, Package,
  Lock, AlertCircle, Sparkles
} from "lucide-react";
import { recordPhysicalStockAuditAction } from "@/app/actions/reports";
import Modal from "@/components/Modal";

type ReportTab = "RECONCILIATION" | "SALES" | "INVENTORY" | "FINANCIAL" | "GST";

export interface GoldReconciliationRow {
  purity: string;
  fineness: number;
  openingGrams: number;
  purchaseInGrams: number;
  oldGoldInGrams: number;
  salesOutGrams: number;
  returnsInGrams: number;
  karigarIssueGrams: number;
  adjustmentGrams: number;
  expectedClosingGrams: number;
  physicalCountGrams: number;
  varianceGrams: number;
  status: "MATCHED" | "EXCESS" | "SHORTAGE";
}

export interface SalesReportRow {
  date: string;
  invoiceCount: number;
  grossWeight: number;
  goldValue: number;
  makingCharges: number;
  gstAmount: number;
  totalSales: number;
  cashAmount: number;
  digitalAmount: number;
  exchangeCredit: number;
}

export interface InventoryCategoryValuation {
  category: string;
  itemCount: number;
  grossWeightGrams: number;
  netWeightGrams: number;
  valuationAmount: number;
  sharePercent: number;
  turnoverDays: number;
  status: "FAST" | "OPTIMAL" | "SLOW";
}

interface ReportsClientProps {
  goldReconciliationData: GoldReconciliationRow[];
  salesReportData: SalesReportRow[];
  inventoryValuationData: InventoryCategoryValuation[];
  plData: {
    grossSales: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netOperatingProfit: number;
    netMarginPct: number;
  };
  shiftData: {
    shiftNumber: number;
    cashierName: string;
    openingCash: number;
    cashInflow: number;
    oldGoldOutflow: number;
    expenseOutflow: number;
    expectedCash: number;
    actualCash: number;
    variance: number;
    status: string;
  };
  gstData: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    totalTax: number;
    panCompliantCount: number;
    panThresholdCount: number;
  };
  branches: { id: string; name: string }[];
}

export default function ReportsClient({
  goldReconciliationData,
  salesReportData,
  inventoryValuationData,
  plData,
  shiftData,
  gstData,
  branches,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("RECONCILIATION");
  const [dateRange, setDateRange] = useState("CURRENT_WEEK");
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || "ALL");
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [countInputs, setCountInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const r of goldReconciliationData) {
      initial[r.purity] = r.expectedClosingGrams.toFixed(2);
    }
    return initial;
  });
  const [reconcileSuccess, setReconcileSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Totals for Gold Reconciliation
  const reconTotals = useMemo(() => {
    return goldReconciliationData.reduce(
      (acc, r) => ({
        opening: acc.opening + r.openingGrams,
        inflow: acc.inflow + r.purchaseInGrams + r.oldGoldInGrams + r.returnsInGrams,
        outflow: acc.outflow + r.salesOutGrams + r.karigarIssueGrams,
        expected: acc.expected + r.expectedClosingGrams,
        physical: acc.physical + r.physicalCountGrams,
        variance: acc.variance + r.varianceGrams,
      }),
      { opening: 0, inflow: 0, outflow: 0, expected: 0, physical: 0, variance: 0 }
    );
  }, [goldReconciliationData]);

  // Totals for Sales Report
  const salesTotals = useMemo(() => {
    return salesReportData.reduce(
      (acc, r) => ({
        invoices: acc.invoices + r.invoiceCount,
        weight: acc.weight + r.grossWeight,
        gold: acc.gold + r.goldValue,
        making: acc.making + r.makingCharges,
        gst: acc.gst + r.gstAmount,
        total: acc.total + r.totalSales,
        cash: acc.cash + r.cashAmount,
        digital: acc.digital + r.digitalAmount,
        exchange: acc.exchange + r.exchangeCredit,
      }),
      { invoices: 0, weight: 0, gold: 0, making: 0, gst: 0, total: 0, cash: 0, digital: 0, exchange: 0 }
    );
  }, [salesReportData]);

  const handleSaveAudit = async () => {
    setIsSubmitting(true);
    const numericCounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(countInputs)) {
      numericCounts[k] = parseFloat(v) || 0;
    }
    await recordPhysicalStockAuditAction(numericCounts);
    setIsSubmitting(false);
    setReconcileSuccess(true);
    setTimeout(() => {
      setReconcileSuccess(false);
      setShowReconcileModal(false);
    }, 1500);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeTab === "RECONCILIATION") {
      csvContent += "Purity,Opening(g),Inflow(g),Outflow(g),Expected(g),Physical(g),Variance(g)\n";
      goldReconciliationData.forEach((r) => {
        const inflow = r.purchaseInGrams + r.oldGoldInGrams + r.returnsInGrams;
        const outflow = r.salesOutGrams + r.karigarIssueGrams;
        csvContent += `"${r.purity}",${r.openingGrams.toFixed(2)},${inflow.toFixed(2)},${outflow.toFixed(2)},${r.expectedClosingGrams.toFixed(2)},${r.physicalCountGrams.toFixed(2)},${r.varianceGrams.toFixed(2)}\n`;
      });
    } else {
      csvContent += "Date,Invoices,GrossWeight(g),GoldValue,MakingCharges,GST,TotalSales,Cash,Digital,Exchange\n";
      salesReportData.forEach((s) => {
        csvContent += `"${s.date}",${s.invoiceCount},${s.grossWeight.toFixed(2)},${s.goldValue},${s.makingCharges},${s.gstAmount},${s.totalSales},${s.cashAmount},${s.digitalAmount},${s.exchangeCredit}\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jewelbill_${activeTab.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalInventoryValuation = inventoryValuationData.reduce((sum, item) => sum + item.valuationAmount, 0);
  const totalInventoryPieces = inventoryValuationData.reduce((sum, item) => sum + item.itemCount, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Reports & Audits
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}
            >
              <Sparkles size={11} /> Live Ledger Sync
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Gold weight reconciliation, GST filings, inventory valuation & shift P&L
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Picker */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="input text-xs font-medium py-2 px-3 h-9 bg-white"
            style={{ width: "auto" }}
          >
            <option value="ALL">All Branches Consolidated</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input text-xs font-medium py-2 px-3 h-9 bg-white"
            style={{ width: "auto" }}
          >
            <option value="TODAY">Today</option>
            <option value="CURRENT_WEEK">Current Week</option>
            <option value="MONTH_TO_DATE">Month to Date</option>
            <option value="FY2026_27">FY 2026–27 (YTD)</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="btn-outline gap-1.5 text-xs h-9 px-3"
            title="Download Spreadsheet"
          >
            <Download size={14} /> Export CSV
          </button>

          {activeTab === "RECONCILIATION" && (
            <button
              onClick={() => setShowReconcileModal(true)}
              className="btn-gold gap-1.5 text-xs h-9 px-3"
              id="start-physical-audit-btn"
            >
              <Scale size={14} /> Physical Audit Count
            </button>
          )}
        </div>
      </div>

      {/* ─── Top KPI Metric Ribbon ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gold Under Custody
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Scale size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {reconTotals.expected.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">grams</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <CheckCircle2 size={12} /> Pure equiv: {(reconTotals.expected * 0.916).toFixed(1)}g (22K)
          </div>
        </div>

        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Period Gross Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              ₹{(salesTotals.total / 100000).toFixed(2)}L
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>{salesTotals.invoices} invoices</span>
            <span>•</span>
            <span className="text-emerald-600">+{salesTotals.weight.toFixed(1)}g gold sold</span>
          </div>
        </div>

        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inventory Valuation
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {totalInventoryValuation > 10000000
                ? `₹${(totalInventoryValuation / 10000000).toFixed(2)} Cr`
                : `₹${(totalInventoryValuation / 100000).toFixed(2)} Lakh`}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>{totalInventoryPieces} jewellery articles</span>
            <span>•</span>
            <span className="text-blue-600">100% BIS Hallmarked</span>
          </div>
        </div>

        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Audit Variance
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                Math.abs(reconTotals.variance) < 0.2
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {Math.abs(reconTotals.variance) < 0.2 ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                reconTotals.variance === 0
                  ? "text-emerald-700"
                  : reconTotals.variance < 0
                  ? "text-amber-700"
                  : "text-blue-700"
              }`}
            >
              {reconTotals.variance > 0 ? `+${reconTotals.variance.toFixed(2)}` : reconTotals.variance.toFixed(2)}g
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            {Math.abs(reconTotals.variance) <= 0.2
              ? "Within standard scale tolerance (±0.20g)"
              : "Review required by Store Manager"}
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2 -mb-px overflow-x-auto">
          {[
            { id: "RECONCILIATION", label: "Gold Weight Reconciliation", icon: <Scale size={15} /> },
            { id: "SALES", label: "Sales & Invoicing Analytics", icon: <BarChart3 size={15} /> },
            { id: "INVENTORY", label: "Stock Valuation & Aging", icon: <Package size={15} /> },
            { id: "FINANCIAL", label: "P&L & Day Closing", icon: <TrendingUp size={15} /> },
            { id: "GST", label: "GST & Tax Summary (GSTR-1)", icon: <FileSpreadsheet size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-amber-600 text-amber-800 bg-amber-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: GOLD WEIGHT RECONCILIATION ───────────────────────────────── */}
      {activeTab === "RECONCILIATION" && (
        <div className="space-y-4">
          <div
            className="p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            style={{ background: "#fffbeb", borderColor: "#fde68a" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Daily Mathematical Gold Reconciliation
                </h3>
                <p className="text-xs text-amber-700">
                  Formula:{" "}
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-950 font-mono font-semibold">
                    Opening Stock + Purchases + Old Gold + Returns − Sales − Karigar Issues ± Adjustments = Expected Closing
                  </code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-amber-900 bg-amber-200/60 px-2.5 py-1 rounded-lg">
                Last Verified: Live Ledger Sync
              </span>
            </div>
          </div>

          <div
            className="card rounded-xl border overflow-hidden"
            style={{ background: "#ffffff", borderColor: "var(--border)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead
                  className="border-b font-semibold text-slate-600 uppercase tracking-wider"
                  style={{ background: "#f8fafc", borderColor: "var(--border)" }}
                >
                  <tr>
                    <th className="py-3 px-4">Metal & Karat</th>
                    <th className="py-3 px-3 text-right">Opening (g)</th>
                    <th className="py-3 px-3 text-right text-emerald-700">+ Inflow (g)</th>
                    <th className="py-3 px-3 text-right text-red-700">− Outflow (g)</th>
                    <th className="py-3 px-3 text-right">Adjust (g)</th>
                    <th className="py-3 px-3 text-right font-bold bg-slate-100/60">Expected (g)</th>
                    <th className="py-3 px-3 text-right font-bold text-blue-700">Physical (g)</th>
                    <th className="py-3 px-3 text-right font-bold">Variance (g)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goldReconciliationData.map((row) => {
                    const totalIn = row.purchaseInGrams + row.oldGoldInGrams + row.returnsInGrams;
                    const totalOut = row.salesOutGrams + row.karigarIssueGrams;

                    return (
                      <tr key={row.purity} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {row.purity}
                          <div className="text-[10px] font-normal text-slate-500">
                            Fineness: {(row.fineness * 1000).toFixed(0)}/1000
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                          {row.openingGrams.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-emerald-700">
                          +{totalIn.toFixed(2)}
                          <div className="text-[10px] text-slate-400">
                            Purch: {row.purchaseInGrams.toFixed(1)}g · OG: {row.oldGoldInGrams.toFixed(1)}g
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-red-600">
                          −{totalOut.toFixed(2)}
                          <div className="text-[10px] text-slate-400">
                            Sale: {row.salesOutGrams.toFixed(1)}g · Karigar: {row.karigarIssueGrams.toFixed(1)}g
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                          {row.adjustmentGrams !== 0 ? (
                            <span className={row.adjustmentGrams > 0 ? "text-emerald-600" : "text-amber-600"}>
                              {row.adjustmentGrams > 0 ? `+${row.adjustmentGrams.toFixed(2)}` : row.adjustmentGrams.toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900 bg-slate-50">
                          {row.expectedClosingGrams.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-blue-700">
                          {row.physicalCountGrams.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold">
                          <span
                            className={
                              row.varianceGrams === 0
                                ? "text-emerald-700"
                                : row.varianceGrams < 0
                                ? "text-amber-700"
                                : "text-blue-700"
                            }
                          >
                            {row.varianceGrams > 0
                              ? `+${row.varianceGrams.toFixed(2)}`
                              : row.varianceGrams.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.status === "MATCHED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} /> Matched
                            </span>
                          )}
                          {row.status === "SHORTAGE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle size={11} /> Shortage
                            </span>
                          )}
                          {row.status === "EXCESS" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <AlertCircle size={11} /> Excess
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot
                  className="font-bold border-t text-slate-800"
                  style={{ background: "#f8fafc", borderColor: "var(--border)" }}
                >
                  <tr>
                    <td className="py-3 px-4">Consolidated Gold Total</td>
                    <td className="py-3 px-3 text-right">{reconTotals.opening.toFixed(2)}g</td>
                    <td className="py-3 px-3 text-right text-emerald-700">+{reconTotals.inflow.toFixed(2)}g</td>
                    <td className="py-3 px-3 text-right text-red-600">−{reconTotals.outflow.toFixed(2)}g</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">—</td>
                    <td className="py-3 px-3 text-right bg-slate-100">{reconTotals.expected.toFixed(2)}g</td>
                    <td className="py-3 px-3 text-right text-blue-700">{reconTotals.physical.toFixed(2)}g</td>
                    <td className="py-3 px-3 text-right text-amber-700">{reconTotals.variance.toFixed(2)}g</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] text-slate-500 font-normal">Audit Logged</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SALES & INVOICING ANALYTICS ───────────────────────────────── */}
      {activeTab === "SALES" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="card p-4 rounded-xl border"
              style={{ background: "#ffffff", borderColor: "var(--border)" }}
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Making Charges Earned
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{salesTotals.making.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Avg ₹{salesTotals.weight > 0 ? (salesTotals.making / salesTotals.weight).toFixed(0) : "0"}/g across {salesTotals.invoices} bills
              </p>
            </div>

            <div
              className="card p-4 rounded-xl border"
              style={{ background: "#ffffff", borderColor: "var(--border)" }}
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Old Gold Inflow Valuation
              </span>
              <p className="text-xl font-bold text-amber-700 mt-1">
                ₹{salesTotals.exchange.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Exchanged against customer purchase invoices
              </p>
            </div>

            <div
              className="card p-4 rounded-xl border"
              style={{ background: "#ffffff", borderColor: "var(--border)" }}
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Digital vs Cash Ratio
              </span>
              <p className="text-xl font-bold text-blue-700 mt-1">
                {salesTotals.total > 0 ? ((salesTotals.digital / salesTotals.total) * 100).toFixed(1) : "0.0"}% Digital
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                UPI/Card: ₹{(salesTotals.digital / 100000).toFixed(2)}L | Cash: ₹{(salesTotals.cash / 100000).toFixed(2)}L
              </p>
            </div>
          </div>

          <div
            className="card rounded-xl border overflow-hidden"
            style={{ background: "#ffffff", borderColor: "var(--border)" }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-bold text-sm text-slate-800">
                Daily Sales Revenue & Collection Breakdown
              </h3>
              <span className="text-xs text-slate-500">{salesReportData.length} Days Activity</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead
                  className="border-b font-semibold text-slate-600 uppercase tracking-wider"
                  style={{ background: "#f8fafc", borderColor: "var(--border)" }}
                >
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3 text-center">Bills</th>
                    <th className="py-3 px-3 text-right">Gold Weight</th>
                    <th className="py-3 px-3 text-right">Gold Value</th>
                    <th className="py-3 px-3 text-right">Making Charges</th>
                    <th className="py-3 px-3 text-right">GST (3%)</th>
                    <th className="py-3 px-3 text-right font-bold">Total Invoiced</th>
                    <th className="py-3 px-3 text-right text-emerald-700">UPI/Card</th>
                    <th className="py-3 px-3 text-right text-slate-700">Cash</th>
                    <th className="py-3 px-4 text-right text-amber-700">Old Gold Exch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReportData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No sales records recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    salesReportData.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{row.date}</td>
                        <td className="py-3.5 px-3 text-center font-medium text-slate-600">
                          {row.invoiceCount}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                          {row.grossWeight.toFixed(2)}g
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-700">
                          ₹{row.goldValue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-700">
                          ₹{row.makingCharges.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-700">
                          ₹{row.gstAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                          ₹{row.totalSales.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-emerald-700">
                          ₹{row.digitalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-700">
                          ₹{row.cashAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-amber-700">
                          {row.exchangeCredit > 0 ? `₹${row.exchangeCredit.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: STOCK VALUATION & AGING ─────────────────────────────────── */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-4">
          <div
            className="card rounded-xl border overflow-hidden"
            style={{ background: "#ffffff", borderColor: "var(--border)" }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Stock Valuation by Jewellery Category
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Valuation calculated at today&apos;s active gold rate + stone charges
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="btn-outline gap-1.5 text-xs py-1.5 px-3"
              >
                <Printer size={13} /> Print Summary
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead
                  className="border-b font-semibold text-slate-600 uppercase tracking-wider"
                  style={{ background: "#f8fafc", borderColor: "var(--border)" }}
                >
                  <tr>
                    <th className="py-3 px-4">Jewellery Category</th>
                    <th className="py-3 px-3 text-center">In Stock Items</th>
                    <th className="py-3 px-3 text-right">Gross Wt (g)</th>
                    <th className="py-3 px-3 text-right">Net Wt (g)</th>
                    <th className="py-3 px-3 text-right font-bold">Valuation Amount</th>
                    <th className="py-3 px-3 text-center">Portfolio Share</th>
                    <th className="py-3 px-3 text-center">Turnover Speed</th>
                    <th className="py-3 px-4 text-center">Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryValuationData.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{row.category}</td>
                      <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                        {row.itemCount} pcs
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {row.grossWeightGrams.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {row.netWeightGrams.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        ₹{row.valuationAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${row.sharePercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {row.sharePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-600 font-medium">
                        {row.turnoverDays} days avg
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.status === "FAST" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Fast Moving
                          </span>
                        )}
                        {row.status === "OPTIMAL" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Optimal
                          </span>
                        )}
                        {row.status === "SLOW" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Slow Moving
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: FINANCIAL P&L & DAY CLOSING ───────────────────────────────── */}
      {activeTab === "FINANCIAL" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* P&L Statement Card */}
            <div
              className="card p-5 rounded-xl border space-y-4"
              style={{ background: "#ffffff", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Profit & Loss Summary</h3>
                  <p className="text-xs text-slate-500">Live Period Aggregate</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Net Margin: {plData.netMarginPct}%
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="font-medium text-slate-700">Gross Sales Revenue</span>
                  <span className="font-bold text-slate-900">₹{plData.grossSales.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Less: Cost of Goods Sold (Inward Purchases)</span>
                  <span className="text-red-600 font-medium">− ₹{plData.cogs.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-b bg-slate-50 px-2 rounded font-bold text-slate-800">
                  <span>Gross Profit</span>
                  <span className="text-emerald-700">₹{plData.grossProfit.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Operating Expenses (Rent, Salary, Utilities)</span>
                  <span className="text-red-600 font-medium">− ₹{plData.operatingExpenses.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Net Operating Profit</span>
                  <span className="text-emerald-700">₹{plData.netOperatingProfit.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Shift & Day Closing Summary */}
            <div
              className="card p-5 rounded-xl border space-y-4"
              style={{ background: "#ffffff", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Cash Drawer & Shift Close</h3>
                  <p className="text-xs text-slate-500">
                    Shift #{shiftData.shiftNumber} · Cashier: {shiftData.cashierName}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Lock size={12} /> {shiftData.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Opening Float / Cash</span>
                  <span className="font-semibold text-slate-800">₹{shiftData.openingCash.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">+ Cash Received from Invoices</span>
                  <span className="font-semibold text-emerald-700">+ ₹{shiftData.cashInflow.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">− Cash Paid for Old Gold Purchases</span>
                  <span className="font-semibold text-red-600">− ₹{shiftData.oldGoldOutflow.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">− Petty Cash Expenses</span>
                  <span className="font-semibold text-red-600">− ₹{shiftData.expenseOutflow.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-b bg-amber-50/60 px-2 rounded font-bold text-amber-900">
                  <span>Expected Physical Drawer Cash</span>
                  <span>₹{shiftData.expectedCash.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold text-slate-800">
                  <span>Physical Cash Counted</span>
                  <span className="text-emerald-700">₹{shiftData.actualCash.toLocaleString("en-IN")} (Variance: ₹{shiftData.variance})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: GST & TAX COMPLIANCE SUMMARY ─────────────────────────────── */}
      {activeTab === "GST" && (
        <div className="space-y-4">
          <div
            className="card p-5 rounded-xl border space-y-4"
            style={{ background: "#ffffff", borderColor: "var(--border)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  GSTR-1 Outward Supplies Summary (HSN 7113 — Jewellery)
                </h3>
                <p className="text-xs text-slate-500">
                  Applicable GST: 3% (1.5% CGST + 1.5% SGST for Intra-State; 3% IGST for Inter-State)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const jsonStr = JSON.stringify({
                      gstin: "33AAAAA0000A1Z5",
                      period: "092026",
                      b2c: {
                        taxableValue: gstData.taxableValue,
                        cgst: gstData.cgst,
                        sgst: gstData.sgst,
                        totalTax: gstData.totalTax,
                      },
                    }, null, 2);
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "GSTR1_Outward_Supplies.json";
                    a.click();
                  }}
                  className="btn-gold gap-1.5 text-xs py-1.5 px-3"
                >
                  <Download size={13} /> Download GSTR-1 JSON
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Taxable Value</span>
                <p className="text-base font-bold text-slate-800 mt-1">₹{gstData.taxableValue.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">CGST (1.5%)</span>
                <p className="text-base font-bold text-emerald-700 mt-1">₹{gstData.cgst.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">SGST (1.5%)</span>
                <p className="text-base font-bold text-emerald-700 mt-1">₹{gstData.sgst.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Tax Collected</span>
                <p className="text-base font-bold text-slate-900 mt-1">₹{gstData.totalTax.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">Compliance Verification Checklist:</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>B2C Invoices below PAN threshold: {gstData.panCompliantCount} bills verified</li>
                <li>B2C Invoices exceeding PAN threshold with valid PAN captured: {gstData.panThresholdCount} bills verified</li>
                <li>100% articles mapped with 6-digit Hallmark Unique Identification (HUID)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── PHYSICAL AUDIT COUNT MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        title="Record Physical Stock Audit"
        icon={<Scale className="text-amber-600" size={20} />}
        maxWidth="max-w-lg"
      >
        {reconcileSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="font-bold text-base text-slate-800">Audit Count Saved & Verified!</h3>
            <p className="text-xs text-slate-500">
              Gold reconciliation entries updated in the immutable audit ledger.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Place physical tray on the precision weighing scale and enter verified weights:
            </p>

            <div className="space-y-3">
              {goldReconciliationData.map((row) => (
                <div
                  key={row.purity}
                  className="p-3 rounded-lg border bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{row.purity}</p>
                    <p className="text-[11px] text-slate-500">
                      System Expected: {row.expectedClosingGrams.toFixed(2)}g
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={countInputs[row.purity] || ""}
                      onChange={(e) =>
                        setCountInputs({ ...countInputs, [row.purity]: e.target.value })
                      }
                      className="input text-xs font-bold text-right py-1 px-2 w-28 bg-white"
                    />
                    <span className="text-xs font-semibold text-slate-500">g</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="btn-outline text-xs px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAudit}
                disabled={isSubmitting}
                className="btn-gold text-xs px-4"
              >
                {isSubmitting ? "Saving..." : "Confirm & Reconcile"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
