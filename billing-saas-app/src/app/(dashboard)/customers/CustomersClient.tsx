"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, ChevronDown, X, Check, Phone, Mail, MapPin,
  Users, IndianRupee, ShoppingCart, Wallet, ArrowUpRight,
  ArrowDownRight, Clock, CheckCircle2, Package, FileText,
  RefreshCw, Scale, Eye, Calendar, AlertCircle,
} from "lucide-react";
import { createCustomerAction } from "@/app/actions/customers";
import Modal from "@/components/Modal";
import SlideOver from "@/components/SlideOver";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerTransaction {
  date: string;
  type: string;
  ref: string;
  amount: number;
  balance: number;
}

export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  gstin: string;
  panNumber: string;
  dob: string;
  anniversary: string;
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
  advanceBalance: number;
  lifetimeValue: number;
  lastVisit: string;
  oldGoldValue: number;
  ordersActive: number;
  repairsActive: number;
  isActive: boolean;
  transactions: CustomerTransaction[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CustomersClient({
  initialCustomers = [],
}: {
  initialCustomers?: CustomerData[];
}) {
  const [customers, setCustomers] = useState<CustomerData[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        searchQuery === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.panNumber && c.panNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [customers, searchQuery]);

  const totalReceivable = customers.reduce((s, c) => s + c.outstanding, 0);
  const totalAdvances = customers.reduce((s, c) => s + c.advanceBalance, 0);
  const totalLTV = customers.reduce((s, c) => s + c.lifetimeValue, 0);

  const handleCustomerAdded = (newC: CustomerData) => {
    setCustomers((prev) => [newC, ...prev]);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Customer CRM & Ledgers
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {customers.length} registered customers · Purchase histories, advance deposits & KYC tracking
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="add-customer-btn"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Customers",
            value: customers.length.toString(),
            sub: `${customers.filter((c) => c.isActive).length} active profiles`,
            icon: <Users size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Lifetime Value (LTV)",
            value: fmt(totalLTV),
            sub: "Total billed sales",
            icon: <IndianRupee size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Outstanding Due",
            value: fmt(totalReceivable),
            sub: `${customers.filter((c) => c.outstanding > 0).length} accounts with balance`,
            icon: <AlertCircle size={18} />,
            color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
          },
          {
            label: "Advance Balance Held",
            value: fmt(totalAdvances),
            sub: "Order advance liabilities",
            icon: <Wallet size={18} />,
            color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd",
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

      {/* Search */}
      <div className="card p-4">
        <div className="search-wrapper">
          <Search size={16} className="search-icon-left" />
          <input
            className="input search-input pr-9"
            placeholder="Search by customer name, phone, PAN or city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="customer-search"
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
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>City</th>
                <th>PAN / KYC</th>
                <th>Purchases</th>
                <th>Lifetime Value</th>
                <th>Advance Balance</th>
                <th>Outstanding Due</th>
                <th>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedCustomer(c)}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-xs font-bold text-amber-900 bg-amber-50 border-amber-200"
                      >
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.email || "No email"}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-xs font-medium text-slate-700">{c.phone}</span></td>
                  <td><span className="text-xs text-slate-600">{c.city || "Chennai"}</span></td>
                  <td>
                    {c.panNumber ? (
                      <span className="badge badge-success text-[10px] font-mono">{c.panNumber}</span>
                    ) : (
                      <span className="badge badge-neutral text-[10px]">Unverified</span>
                    )}
                  </td>
                  <td><span className="badge badge-info text-[10px]">{c.totalPurchases} orders</span></td>
                  <td><span className="text-sm font-bold text-gold">{fmt(c.lifetimeValue)}</span></td>
                  <td>
                    {c.advanceBalance > 0 ? (
                      <span className="badge badge-info text-xs font-bold">{fmt(c.advanceBalance)}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    {c.outstanding > 0 ? (
                      <span className="badge badge-danger text-xs font-bold">{fmt(c.outstanding)}</span>
                    ) : (
                      <span className="badge badge-success text-[10px]">Nil Due</span>
                    )}
                  </td>
                  <td><span className="text-xs font-medium text-slate-600">{c.lastVisit}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      <SlideOver
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name}
        subtitle={selectedCustomer?.phone}
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Receivable Ledger */}
            <div>
              <h4 className="section-title mb-3 flex items-center gap-2">
                <IndianRupee size={16} style={{ color: "var(--gold-500)" }} />
                Receivable Ledger & Balances
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Lifetime Value", value: fmt(selectedCustomer.lifetimeValue), color: "#4f46e5" },
                  { label: "Total Settled", value: fmt(selectedCustomer.totalPaid), color: "#059669" },
                  { label: "Outstanding Due", value: fmt(selectedCustomer.outstanding), color: selectedCustomer.outstanding > 0 ? "#dc2626" : "#059669" },
                  { label: "Advance Balance", value: fmt(selectedCustomer.advanceBalance), color: "#0369a1" },
                  { label: "Old Gold Exchanged", value: fmt(selectedCustomer.oldGoldValue), color: "#b45309" },
                  { label: "Active Custom Orders", value: selectedCustomer.ordersActive.toString(), color: "#7c3aed" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3 border text-center border-slate-200">
                    <p className="text-base font-extrabold" style={{ color: item.color, fontFamily: "var(--font-display)" }}>{item.value}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div>
              <h4 className="section-title mb-3 flex items-center gap-2">
                <Clock size={16} style={{ color: "var(--gold-500)" }} />
                Activity Timeline
              </h4>
              <div className="space-y-2">
                {selectedCustomer.transactions.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: t.type.includes("SALE") ? "#eef2ff" : t.type.includes("ADVANCE") ? "#ecfdf5" : "#fffbeb",
                        color: t.type.includes("SALE") ? "#4f46e5" : t.type.includes("ADVANCE") ? "#059669" : "#b45309",
                      }}
                    >
                      {t.type.includes("SALE") ? <ShoppingCart size={14} /> : t.type.includes("ADVANCE") ? <Wallet size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">{t.type.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{t.ref}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900">{fmt(t.amount)}</p>
                      <p className="text-[10px] text-slate-400">{t.date}</p>
                    </div>
                  </div>
                ))}
                {selectedCustomer.transactions.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No transactions recorded yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Add Customer Modal */}
      {mounted && showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCustomerAdded}
        />
      )}
    </div>
  );
}

// ─── Add Customer Modal Component ─────────────────────────────────────────────

function AddCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (cust: CustomerData) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Chennai");
  const [panNumber, setPanNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setErrorMsg("Name and phone number are required.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createCustomerAction({
        name,
        phone,
        email: email || undefined,
        city,
        panNumber: panNumber || undefined,
        gstin: gstin || undefined,
        address: address || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create customer.");
      } else {
        const newRecord: CustomerData = {
          id: res.customer!.id,
          name: res.customer!.name,
          phone: res.customer!.phone,
          email: res.customer!.email || "",
          city,
          gstin,
          panNumber: res.customer!.panNumber || "",
          dob: "",
          anniversary: "",
          totalPurchases: 0,
          totalPaid: 0,
          outstanding: 0,
          advanceBalance: 0,
          lifetimeValue: 0,
          lastVisit: "Today",
          oldGoldValue: 0,
          ordersActive: 0,
          repairsActive: 0,
          isActive: true,
          transactions: [],
        };
        onSuccess(newRecord);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save customer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add New Customer Profile"
      icon={<Users size={18} className="text-amber-700" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="input-label">Full Name *</label>
              <input
                className="input"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Phone *</label>
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
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="priya@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">City</label>
              <input
                className="input"
                placeholder="Chennai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">PAN Number (for Section 269ST KYC)</label>
              <input
                className="input font-mono uppercase"
                placeholder="ABCPS1234E"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="input-label">GSTIN (Optional)</label>
              <input
                className="input font-mono"
                placeholder="33AABCA1234F1ZK"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="input-label">Residential Address</label>
              <input
                className="input"
                placeholder="Door No, Street Name, Landmark…"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
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
              {submitting ? "Saving…" : "Save Customer"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
