"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { calculatePricing, type ProductPricingInput } from "@/lib/pricing";

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
    discountType: "AMOUNT",
    discountValue: item.discount,
    cgstPercent: 1.5,
    sgstPercent: 1.5,
    igstPercent: 0,
    roundToNearest: 1,
  };
  return calculatePricing(input);
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function BillingClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const filtered = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.huid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = useCallback((product: typeof PRODUCTS[0]) => {
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

  const handleFinalize = () => {
    if (cart.length === 0) return;
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCart([]);
      setDiscount(0);
      setCashReceived("");
      setNotes("");
      setSelectedCustomer(null);
    }, 3000);
  };

  return (
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
              22K Gold Rate: <span className="font-semibold text-gold">₹6,120/g</span>
              &nbsp;·&nbsp;Rate locked at invoice generation
            </p>
          </div>
          {/* Customer selector */}
          <button
            className="btn-outline flex items-center gap-2"
            id="select-customer-btn"
          >
            <User size={16} />
            {selectedCustomer ?? "Select Customer"}
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Product Search */}
        <div className="card p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                id="product-search"
                type="text"
                className="input pl-9"
                placeholder="Search by name, SKU, barcode or HUID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
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
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(245,158,11,0.1)" }}
                        >
                          <Gem size={14} style={{ color: "var(--gold-400)" }} />
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
                            className="mt-2 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1"
                            style={{ background: "var(--bg-surface)" }}
                          >
                            {[
                              ["Net Wt", `${pricing.netGoldWeight}g`],
                              ["Wastage", `${pricing.wastageGrams}g`],
                              ["Gold Value", fmt(pricing.goldValue)],
                              ["Making", fmt(pricing.makingCharge)],
                              ["Stone Charge", fmt(pricing.stoneCharge)],
                              ["Tax (3%)", fmt(pricing.totalTaxAmount)],
                            ].map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-1">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{k}</span>
                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Gold rate + discount inputs */}
                          <div className="mt-2 flex gap-2">
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
                            <div className="flex items-center gap-1">
                              <Tag size={11} style={{ color: "var(--text-muted)" }} />
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Disc:</span>
                              <input
                                type="number"
                                className="input py-1 px-2 text-xs w-20"
                                value={item.discount || ""}
                                onChange={(e) =>
                                  updateDiscount(item.id, parseFloat(e.target.value) || 0)
                                }
                                placeholder="₹0"
                              />
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
                Extra Discount
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
          <h2 className="section-title mb-4">Payment</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                id={`payment-${m.id}`}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all duration-150"
                style={{
                  background:
                    selectedPayment === m.id
                      ? "rgba(245,158,11,0.12)"
                      : "var(--bg-surface)",
                  borderColor:
                    selectedPayment === m.id
                      ? "rgba(245,158,11,0.4)"
                      : "var(--border)",
                  color:
                    selectedPayment === m.id
                      ? "var(--gold-400)"
                      : "var(--text-secondary)",
                }}
                onClick={() => setSelectedPayment(m.id)}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {selectedPayment === "CASH" && (
            <div className="mb-3">
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
                <div className="flex justify-between mt-2 text-sm">
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            className="btn-gold w-full justify-center text-base py-3"
            id="finalize-invoice-btn"
            onClick={handleFinalize}
            disabled={cart.length === 0}
            style={{ opacity: cart.length === 0 ? 0.5 : 1 }}
          >
            <Zap size={18} /> Finalize Invoice ({fmt(Math.max(0, grandTotal))})
          </button>
          <div className="flex gap-2">
            <button
              className="btn-outline flex-1 justify-center gap-2"
              id="print-invoice-btn"
            >
              <Printer size={15} /> Print
            </button>
            <button
              className="btn-outline flex-1 justify-center gap-2"
              id="save-estimate-btn"
            >
              <Receipt size={15} /> Estimate
            </button>
          </div>
        </div>

        {/* Success overlay */}
        {showSuccess && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <div className="card p-8 flex flex-col items-center gap-4 animate-scale-in text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.15)" }}
              >
                <CheckCircle2 size={36} style={{ color: "#34d399" }} />
              </div>
              <div>
                <p
                  className="text-xl font-bold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  Invoice Created!
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  INV-2026-006 · {fmt(Math.max(0, grandTotal))}
                </p>
              </div>
              <div className="flex gap-3">
                <button className="btn-gold">
                  <Printer size={16} /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
