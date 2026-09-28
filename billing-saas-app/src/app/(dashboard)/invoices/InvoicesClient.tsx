"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
import Modal from "@/components/Modal";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Tax Invoice: ${selectedInvoice.invoiceNumber}` : "Tax Invoice"}
        icon={<Receipt size={20} className="text-amber-700" />}
        maxWidth="max-w-2xl"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Customer</p>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{selectedInvoice.customer}</p>
                <p className="text-slate-500 font-mono text-xs">{selectedInvoice.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Invoice Date</p>
                <p className="font-medium text-slate-700 mt-0.5">{selectedInvoice.date}</p>
                <span
                  className={`badge text-[10px] mt-1 ${
                    selectedInvoice.status === "PAID"
                      ? "badge-success"
                      : selectedInvoice.status === "PARTIAL"
                      ? "badge-gold"
                      : "badge-danger"
                  }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-2 uppercase text-[10px] tracking-wider">Line Items Breakdown</p>
              <div className="space-y-2">
                {selectedInvoice.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.productName}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        SKU: {item.sku} {item.huid ? `· HUID: ${item.huid}` : ""} · Net Weight: {item.netWeight}g
                      </p>
                    </div>
                    <p className="font-bold text-gold text-sm font-mono">{fmt(item.itemNetAmount)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Taxable Amount:</span>
                <strong className="text-slate-800 font-mono">{fmt(selectedInvoice.grossAmount)}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Total (3%):</span>
                <strong className="text-slate-800 font-mono">{fmt(selectedInvoice.tax)}</strong>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span>Total Net Payable:</span>
                <span className="text-amber-800 font-mono text-base">{fmt(selectedInvoice.netAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Amount Paid ({selectedInvoice.paymentMethod}):</span>
                <strong className="text-emerald-700 font-mono">{fmt(selectedInvoice.amountPaid)}</strong>
              </div>
              {selectedInvoice.amountDue > 0 && (
                <div className="flex justify-between text-red-600 font-bold pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">{fmt(selectedInvoice.amountDue)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                className="btn-outline text-xs px-4 py-2"
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print Receipt (Ctrl+P)
              </button>
            </div>
          </div>
        )}
      </Modal>

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
