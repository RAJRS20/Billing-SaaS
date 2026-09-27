"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Eye,
  Plus,
  X,
  CreditCard,
  IndianRupee,
} from "lucide-react";
import PrintableInvoiceReceipt, { PrintableReceiptData } from "@/components/PrintableInvoiceReceipt";

export interface InvoiceItemDetail {
  productName: string;
  sku: string;
  huid?: string;
  grossWeight: number;
  netWeight: number;
  makingCharge: number;
  itemNetAmount: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  phone: string;
  itemsSummary: string;
  grossAmount: number;
  tax: number;
  netAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string;
  status: "PAID" | "PENDING" | "PARTIAL";
  items: InvoiceItemDetail[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function InvoicesClient({
  initialInvoices = [],
}: {
  initialInvoices?: InvoiceRecord[];
}) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase()) ||
        inv.phone.includes(search);
      const matchesStatus = filterStatus === "ALL" || inv.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, filterStatus]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.netAmount, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0);
  const totalPending = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Invoices & Billing History
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {invoices.length} finalized GST tax invoices backed by PostgreSQL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/billing" className="btn-gold gap-2 shadow-sm text-xs">
            <Plus size={15} /> New POS Sale
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Billed Revenue</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Receipt size={15} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(totalInvoiced)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {invoices.length} invoices generated
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Invoices Generated</p>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <FileText size={15} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2" style={{ fontFamily: "var(--font-display)" }}>
            {invoices.length}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Avg. {fmt(invoices.length > 0 ? totalInvoiced / invoices.length : 0)} per sale
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">GST Collected (3%)</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(totalTax)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            CGST: {fmt(totalTax / 2)} · SGST: {fmt(totalTax / 2)}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Pending Receivables</p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <AlertCircle size={15} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(totalPending)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {invoices.filter((i) => i.amountDue > 0).length} bills with pending dues
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="search-wrapper flex-1 w-full">
          <Search size={16} className="search-icon-left" />
          <input
            type="text"
            placeholder="Search by invoice #, customer name, or phone..."
            className="input search-input pr-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="input w-full sm:w-auto text-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending Due</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items Sold</th>
                <th>Tax (3%)</th>
                <th>Net Amount</th>
                <th>Settled</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td>
                    <span className="text-xs font-bold text-amber-800">{inv.invoiceNumber}</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-600">{inv.date}</span>
                  </td>
                  <td>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{inv.customer}</p>
                      <p className="text-[10px] text-slate-400">{inv.phone}</p>
                    </div>
                  </td>
                  <td>
                    <p className="text-xs font-medium text-slate-700 max-w-[200px] truncate">
                      {inv.itemsSummary}
                    </p>
                  </td>
                  <td>
                    <span className="text-xs text-slate-500">{fmt(inv.tax)}</span>
                  </td>
                  <td>
                    <span className="text-sm font-bold text-gold">{fmt(inv.netAmount)}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-emerald-700">{fmt(inv.amountPaid)}</span>
                  </td>
                  <td>
                    <span className="badge badge-info text-[10px]">{inv.paymentMethod}</span>
                  </td>
                  <td>
                    <span
                      className={`badge text-[10px] ${
                        inv.status === "PAID"
                          ? "badge-success"
                          : inv.status === "PARTIAL"
                          ? "badge-gold"
                          : "badge-danger"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-ghost p-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(inv);
                      }}
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-xs text-slate-400">
                    No invoices found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal / Print Preview */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center no-print" style={{ pointerEvents: "auto" }}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)} />
          <div className="relative w-full max-w-lg mx-4 card p-0 overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto bg-white">
            <div className="px-6 py-4 flex items-center justify-between border-b bg-amber-50/60 border-amber-200">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-amber-700" />
                <h3 className="font-bold text-sm text-amber-900" style={{ fontFamily: "var(--font-display)" }}>
                  Tax Invoice: {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1"
                  onClick={() => window.print()}
                >
                  <Printer size={13} /> Print
                </button>
                <button className="btn-ghost p-1.5" onClick={() => setSelectedInvoice(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="font-bold text-slate-900">{selectedInvoice.customer}</p>
                  <p className="text-slate-500">{selectedInvoice.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-500">{selectedInvoice.date}</p>
                  <span className="badge badge-success text-[10px] mt-0.5">{selectedInvoice.status}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-2 uppercase text-[10px] tracking-wider">Line Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.sku} {item.huid ? `· HUID: ${item.huid}` : ""} · Net: {item.netWeight}g
                        </p>
                      </div>
                      <p className="font-bold text-gold">{fmt(item.itemNetAmount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Taxable Amount:</span>
                  <strong className="text-slate-800">{fmt(selectedInvoice.grossAmount)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (3%):</span>
                  <strong className="text-slate-800">{fmt(selectedInvoice.tax)}</strong>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Net Payable:</span>
                  <span className="text-amber-800">{fmt(selectedInvoice.netAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Amount Paid ({selectedInvoice.paymentMethod}):</span>
                  <strong className="text-emerald-700">{fmt(selectedInvoice.amountPaid)}</strong>
                </div>
                {selectedInvoice.amountDue > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Balance Due:</span>
                    <span>{fmt(selectedInvoice.amountDue)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional GST-compliant printable receipt template */}
      {selectedInvoice && (
        <PrintableInvoiceReceipt
          data={{
            invoiceNumber: selectedInvoice.invoiceNumber,
            date: selectedInvoice.date,
            customer: {
              name: selectedInvoice.customer,
              phone: selectedInvoice.phone,
              address: "Tirupati, Andhra Pradesh",
            },
            cashierName: "Admin User",
            items: selectedInvoice.items.map((i) => ({
              name: i.productName,
              sku: i.sku,
              huid: i.huid,
              purity: "22K",
              grossWeight: i.grossWeight,
              netWeight: i.netWeight,
              goldRate: 6120,
              makingCharges: 0,
              total: i.itemNetAmount,
            })),
            subtotal: selectedInvoice.grossAmount,
            totalDiscount: 0,
            taxableAmount: selectedInvoice.grossAmount,
            cgst: selectedInvoice.tax / 2,
            sgst: selectedInvoice.tax / 2,
            totalTax: selectedInvoice.tax,
            grandTotal: selectedInvoice.netAmount,
            paymentMode: selectedInvoice.paymentMethod,
            cashReceived: selectedInvoice.amountPaid,
            change: 0,
          }}
        />
      )}
    </div>
  );
}
