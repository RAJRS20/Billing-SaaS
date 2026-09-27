"use client";

import React from "react";

export interface PrintableReceiptItem {
  name: string;
  sku: string;
  huid?: string;
  purity?: string;
  grossWeight: number;
  netWeight: number;
  goldRate: number;
  makingCharges?: number;
  wastageValue?: number;
  total: number;
}

export interface PrintableReceiptData {
  invoiceNumber: string;
  date: string;
  shopDetails?: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
  };
  customer?: {
    name: string;
    phone?: string;
    address?: string;
    panNumber?: string;
  } | null;
  cashierName?: string;
  items: PrintableReceiptItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  grandTotal: number;
  paymentMode: string;
  cashReceived?: number;
  change?: number;
  notes?: string;
}

function numberToIndianWords(num: number): string {
  if (!num || isNaN(num)) return "Zero";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertSection(n: number): string {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  }

  let integerPart = Math.floor(Math.abs(num));
  if (integerPart === 0) return "Zero";

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  const remainder = integerPart;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertSection(crore) + " Crore");
  if (lakh > 0) parts.push(convertSection(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertSection(thousand) + " Thousand");
  if (remainder > 0) parts.push(convertSection(remainder));

  return parts.join(" ") + " Only";
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(v);

export default function PrintableInvoiceReceipt({
  data,
  forceVisible = false,
}: {
  data: PrintableReceiptData;
  forceVisible?: boolean;
}) {
  const shop = data.shopDetails || {
    name: "SRI LAKSHMI JEWELLERS",
    tagline: "Govt. Registered Jewellers · 100% BIS Hallmarked 916 Gold & Diamond Specialists",
    address: "108 Car Street, Main Bazaar, Tirupati - 517501, Andhra Pradesh",
    phone: "+91 98765 43210 / 0877-2234567",
    email: "billing@srilakshmi.com",
    gstin: "37AAAAA0000A1Z5",
    pan: "AAAAA0000A",
  };

  const totalGrossWeight = data.items.reduce((s, i) => s + (i.grossWeight || 0), 0);
  const totalNetWeight = data.items.reduce((s, i) => s + (i.netWeight || 0), 0);

  return (
    <div
      id="jewellery-printable-receipt"
      className={`${forceVisible ? "block" : "hidden print:block"} bg-white text-black p-6 font-sans leading-tight text-xs shadow-xs`}
      style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}
    >
      {/* ─── Header: Shop Details ───────────────────────────────────────── */}
      <div className="border-b-2 border-slate-900 pb-3 text-center">
        <h1 className="text-2xl font-black tracking-wider uppercase text-slate-950 font-serif">
          {shop.name}
        </h1>
        <p className="text-[11px] font-semibold text-slate-700 tracking-wide mt-0.5">
          {shop.tagline}
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          {shop.address}
        </p>
        <div className="flex justify-center items-center gap-4 text-[10px] font-mono text-slate-800 mt-1">
          <span><strong>GSTIN:</strong> {shop.gstin}</span>
          <span>·</span>
          <span><strong>PAN:</strong> {shop.pan}</span>
          <span>·</span>
          <span><strong>Tel:</strong> {shop.phone}</span>
        </div>
      </div>

      {/* ─── Document Title ────────────────────────────────────────────── */}
      <div className="text-center py-2 border-b border-dashed border-slate-400">
        <span className="text-sm font-bold tracking-widest uppercase border border-slate-800 px-3 py-0.5">
          TAX INVOICE / CASH MEMO
        </span>
        <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">
          (Original for Recipient · As per Section 31 of CGST Act, 2017)
        </p>
      </div>

      {/* ─── Invoice Meta & Customer Information ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-800 text-[11px]">
        {/* Left: Invoice Info */}
        <div className="space-y-1">
          <div>
            <span className="text-slate-500">Invoice No: </span>
            <strong className="font-mono text-sm text-slate-950 font-bold">{data.invoiceNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500">Invoice Date & Time: </span>
            <strong className="text-slate-800">{data.date}</strong>
          </div>
          <div>
            <span className="text-slate-500">Place of Supply: </span>
            <strong className="text-slate-800">37 - Andhra Pradesh</strong>
          </div>
          <div>
            <span className="text-slate-500">Cashier / Staff: </span>
            <strong className="text-slate-800">{data.cashierName || "Main Counter"}</strong>
          </div>
        </div>

        {/* Right: Customer Info */}
        <div className="space-y-1 border-l pl-4 border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billed To (Customer):</p>
          <div>
            <span className="text-slate-500">Name: </span>
            <strong className="text-slate-900 text-xs">
              {data.customer?.name || "Walk-in Retail Customer"}
            </strong>
          </div>
          {data.customer?.phone && (
            <div>
              <span className="text-slate-500">Mobile: </span>
              <span className="font-mono text-slate-800">{data.customer.phone}</span>
            </div>
          )}
          {data.customer?.address && (
            <div>
              <span className="text-slate-500">City / Address: </span>
              <span className="text-slate-800">{data.customer.address}</span>
            </div>
          )}
          {data.customer?.panNumber && (
            <div>
              <span className="text-slate-500">Customer PAN: </span>
              <span className="font-mono font-bold text-slate-900">{data.customer.panNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Line Items Table ──────────────────────────────────────────── */}
      <div className="mt-3">
        <table className="w-full text-left border-collapse border border-slate-800">
          <thead>
            <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-900 border-b border-slate-800">
              <th className="p-1.5 border-r border-slate-800 text-center w-8">#</th>
              <th className="p-1.5 border-r border-slate-800">Item Description</th>
              <th className="p-1.5 border-r border-slate-800 text-center">HSN</th>
              <th className="p-1.5 border-r border-slate-800 text-center">HUID / Tag</th>
              <th className="p-1.5 border-r border-slate-800 text-center">Purity</th>
              <th className="p-1.5 border-r border-slate-800 text-right">Gross (g)</th>
              <th className="p-1.5 border-r border-slate-800 text-right">Net (g)</th>
              <th className="p-1.5 border-r border-slate-800 text-right">Rate/g</th>
              <th className="p-1.5 border-r border-slate-800 text-right">Making</th>
              <th className="p-1.5 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="text-[11px] divide-y divide-slate-300">
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-slate-300">
                <td className="p-1.5 border-r border-slate-300 text-center font-mono">{index + 1}</td>
                <td className="p-1.5 border-r border-slate-300 font-semibold text-slate-900">
                  {item.name}
                  <div className="text-[9px] text-slate-500 font-mono font-normal">SKU: {item.sku}</div>
                </td>
                <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px]">7113</td>
                <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-900 text-[10px]">
                  {item.huid || "—"}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800 text-[10px]">
                  {item.purity || "22K"}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right font-mono">{item.grossWeight.toFixed(3)}</td>
                <td className="p-1.5 border-r border-slate-300 text-right font-mono font-semibold">{item.netWeight.toFixed(3)}</td>
                <td className="p-1.5 border-r border-slate-300 text-right font-mono">₹{item.goldRate.toLocaleString("en-IN")}</td>
                <td className="p-1.5 border-r border-slate-300 text-right font-mono">
                  {item.makingCharges ? `₹${item.makingCharges.toLocaleString("en-IN")}` : "—"}
                </td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-950">
                  {fmt(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-800 text-[11px]">
              <td colSpan={5} className="p-1.5 text-right uppercase border-r border-slate-800">
                Total Weight:
              </td>
              <td className="p-1.5 text-right font-mono border-r border-slate-800">{totalGrossWeight.toFixed(3)}g</td>
              <td className="p-1.5 text-right font-mono border-r border-slate-800">{totalNetWeight.toFixed(3)}g</td>
              <td colSpan={2} className="p-1.5 text-right border-r border-slate-800 uppercase">
                Items Subtotal:
              </td>
              <td className="p-1.5 text-right font-mono font-bold">{fmt(data.subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ─── Financial & Tax Calculation Summary ────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mt-3 pt-2 border-t border-slate-800">
        {/* Left: Statutory Hallmark & Quality Notice */}
        <div className="space-y-2 text-[10px] text-slate-600">
          <div className="border border-slate-300 p-2 rounded bg-slate-50 space-y-1">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              BIS Hallmark & Legal Assurance
            </p>
            <p>✔ Certified 100% BIS Hallmarked Jewellery with unique 6-digit alphanumeric HUID.</p>
            <p>✔ Purity certified as per Bureau of Indian Standards (BIS 916 for 22K / BIS 750 for 18K).</p>
            <p>✔ Exchange or return permitted within 7 days with original tax invoice & intact tags.</p>
            <p>✔ Subject to Tirupati jurisdiction.</p>
          </div>
          <div>
            <span className="font-bold text-slate-800">Amount in Words: </span>
            <span className="italic font-semibold text-slate-900">{numberToIndianWords(data.grandTotal)}</span>
          </div>
        </div>

        {/* Right: Tax Breakdown & Grand Total */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">Taxable Gross Amount:</span>
            <strong className="font-mono text-slate-900">{fmt(data.taxableAmount || data.subtotal)}</strong>
          </div>
          {data.totalDiscount > 0 && (
            <div className="flex justify-between border-b border-slate-200 pb-1 text-emerald-800">
              <span>Trade Discount:</span>
              <strong className="font-mono">- {fmt(data.totalDiscount)}</strong>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">CGST (1.5%):</span>
            <strong className="font-mono text-slate-900">{fmt(data.cgst || data.totalTax / 2)}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">SGST (1.5%):</span>
            <strong className="font-mono text-slate-900">{fmt(data.sgst || data.totalTax / 2)}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-600">Total GST (3.0%):</span>
            <strong className="font-mono text-slate-900">{fmt(data.totalTax)}</strong>
          </div>
          <div className="flex justify-between items-center bg-slate-100 p-2 border-2 border-slate-900 rounded font-black text-sm">
            <span className="uppercase tracking-wider text-slate-950">Grand Total:</span>
            <span className="font-mono text-base text-slate-950">{fmt(data.grandTotal)}</span>
          </div>

          {/* Payment Settlement */}
          <div className="pt-2 text-[10px] space-y-0.5 text-slate-700">
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <strong className="font-semibold uppercase text-slate-900">{data.paymentMode}</strong>
            </div>
            {data.cashReceived !== undefined && data.cashReceived > 0 && (
              <div className="flex justify-between">
                <span>Amount Received:</span>
                <span className="font-mono font-semibold">{fmt(data.cashReceived)}</span>
              </div>
            )}
            {data.change !== undefined && data.change > 0 && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>Change Returned:</span>
                <span className="font-mono">{fmt(data.change)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Signatures Footer ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-400 text-center text-[10px]">
        <div>
          <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
          <p className="font-bold text-slate-800 uppercase">Customer's Signature</p>
          <p className="text-[9px] text-slate-500">I accept the purity, weight & invoice terms</p>
        </div>
        <div>
          <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
          <p className="font-bold text-slate-900 uppercase">For {shop.name}</p>
          <p className="text-[9px] text-slate-500">Authorized Signatory / Manager</p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-4 pt-2 text-center text-[9px] text-slate-400 border-t border-dotted border-slate-300">
        Generated electronically via JewelBill SaaS ERP Platform · System Certified Invoice
      </div>
    </div>
  );
}
