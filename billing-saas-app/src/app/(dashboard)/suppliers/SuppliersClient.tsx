"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Phone, Mail, MapPin, Building2,
  ChevronDown, X, Check, FileText, Eye,
  IndianRupee, Calendar, CreditCard, Truck,
  ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle,
} from "lucide-react";
import { createSupplierAction } from "@/app/actions/purchases";
import Modal from "@/components/Modal";
import SlideOver from "@/components/SlideOver";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupplierData {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  gstin: string;
  panNumber: string;
  contactPerson: string;
  creditTermDays: number;
  totalPurchases: number;
  totalPaid: number;
  totalDue: number;
  lastPurchaseDate: string;
  isActive: boolean;
  category: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SuppliersClient({
  initialSuppliers = [],
}: {
  initialSuppliers?: SupplierData[];
}) {
  const [suppliers, setSuppliers] = useState<SupplierData[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === "ALL" || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [suppliers, searchQuery, categoryFilter]);

  const totalPayable = suppliers.reduce((s, i) => s + i.totalDue, 0);
  const totalPurchaseValue = suppliers.reduce((s, i) => s + i.totalPurchases, 0);
  const categories = [...new Set(suppliers.map((s) => s.category))];

  const handleSupplierAdded = (newSup: SupplierData) => {
    setSuppliers((prev) => [newSup, ...prev]);
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
            Suppliers & Bullion Vendors
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {suppliers.length} suppliers · Manage contacts, purchase orders & payable ledger
          </p>
        </div>
        <button className="btn-gold text-xs" id="add-supplier-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Suppliers",
            value: suppliers.length.toString(),
            sub: `${suppliers.filter((s) => s.isActive).length} active accounts`,
            icon: <Truck size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Total Purchases",
            value: fmt(totalPurchaseValue),
            sub: "Cumulative purchases",
            icon: <TrendingUp size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Total Payable",
            value: fmt(totalPayable),
            sub: `${suppliers.filter((s) => s.totalDue > 0).length} suppliers with dues`,
            icon: <IndianRupee size={18} />,
            color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
          },
          {
            label: "Active Terms",
            value: `${Math.round(suppliers.reduce((s, i) => s + (i.creditTermDays || 30), 0) / (suppliers.length || 1))} days`,
            sub: "Average credit window",
            icon: <Calendar size={18} />,
            color: "#b45309", bg: "#fffbeb", border: "#fde68a",
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

      {/* Search & Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="search-wrapper flex-1 min-w-[220px]">
          <Search size={16} className="search-icon-left" />
          <input
            className="input search-input pr-9"
            placeholder="Search by name, phone, GSTIN or contact person…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="supplier-search"
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            id="supplier-category-filter"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* Supplier Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Location</th>
                <th>GSTIN</th>
                <th>Total Purchases</th>
                <th>Paid</th>
                <th>Outstanding Due</th>
                <th>Credit Term</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedSupplier(s)}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-xs font-bold"
                        style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}
                      >
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.contactPerson}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info text-[10px]">{s.category}</span>
                  </td>
                  <td>
                    <div>
                      <p className="text-xs font-medium text-slate-700">{s.phone}</p>
                      <p className="text-[10px] text-slate-400">{s.email}</p>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs text-slate-600">{s.city || "Chennai"}</span>
                  </td>
                  <td>
                    <span className="font-mono text-[11px] text-slate-600">{s.gstin || "—"}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-slate-700">{fmt(s.totalPurchases)}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold" style={{ color: "#059669" }}>{fmt(s.totalPaid)}</span>
                  </td>
                  <td>
                    {s.totalDue > 0 ? (
                      <span className="badge badge-danger text-xs font-bold">{fmt(s.totalDue)}</span>
                    ) : (
                      <span className="badge badge-success text-[10px]">Nil Due</span>
                    )}
                  </td>
                  <td>
                    <span className="text-xs text-slate-600">{s.creditTermDays} days</span>
                  </td>
                  <td>
                    <span className={`badge ${s.isActive ? "badge-success" : "badge-neutral"} text-[10px]`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Detail Panel */}
      <SlideOver
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name}
        subtitle={`${selectedSupplier?.category} Supplier`}
      >
        {selectedSupplier && (
          <div className="space-y-6">
            {/* Financial Snapshot */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Total Orders</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{fmt(selectedSupplier.totalPurchases)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-emerald-50/60 border-emerald-200">
                <p className="text-[10px] uppercase font-semibold text-emerald-700">Settled</p>
                <p className="text-sm font-bold text-emerald-800 mt-1">{fmt(selectedSupplier.totalPaid)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-red-50/60 border-red-200">
                <p className="text-[10px] uppercase font-semibold text-red-700">Due Balance</p>
                <p className="text-sm font-bold text-red-800 mt-1">{fmt(selectedSupplier.totalDue)}</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="section-title">Supplier Information</h4>
              <div className="space-y-2 rounded-xl border p-4 border-slate-200 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Contact Person:</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier.contactPerson || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Phone Number:</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier.email || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">GSTIN:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedSupplier.gstin || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">PAN Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedSupplier.panNumber || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Address:</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier.address || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Credit Window:</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier.creditTermDays} days</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Add Supplier Modal */}
      {mounted && showAddModal && (
        <AddSupplierModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSupplierAdded}
        />
      )}
    </div>
  );
}

// ─── Add Supplier Modal Component ─────────────────────────────────────────────

function AddSupplierModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (supplier: SupplierData) => void;
}) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Gold");
  const [gstin, setGstin] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [creditTermDays, setCreditTermDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setErrorMsg("Business name and phone number are required.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createSupplierAction({
        name,
        phone,
        email: email || undefined,
        address: address ? `${address}, ${city}` : city,
        gstin: gstin || undefined,
        panNumber: panNumber || undefined,
        notes: `Contact: ${contactPerson} · Category: ${category} · Terms: ${creditTermDays}d`,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create supplier.");
      } else {
        const newRecord: SupplierData = {
          id: res.supplier!.id,
          name: res.supplier!.name,
          phone: res.supplier!.phone,
          email: res.supplier!.email || "",
          address: res.supplier!.address || "",
          city,
          gstin: res.supplier!.gstin || "",
          panNumber: res.supplier!.panNumber || "",
          contactPerson,
          creditTermDays: parseInt(creditTermDays, 10) || 30,
          totalPurchases: 0,
          totalPaid: 0,
          totalDue: 0,
          lastPurchaseDate: "Never",
          isActive: true,
          category,
        };
        onSuccess(newRecord);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add New Supplier / Vendor"
      icon={<Building2 size={18} className="text-amber-700" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="input-label">Business Name *</label>
              <input
                className="input"
                placeholder="e.g. Kalyan Gold Pvt Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Contact Person</label>
              <input
                className="input"
                placeholder="e.g. Mr. Rajesh"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
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
                placeholder="sales@supplier.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Diamond">Diamond</option>
                <option value="Stones">Stones</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="input-label">GSTIN</label>
              <input
                className="input"
                placeholder="33AABCK1234E1ZH"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">PAN Number</label>
              <input
                className="input"
                placeholder="AABCK1234E"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="input-label">Address</label>
              <input
                className="input"
                placeholder="42, Mint Street, Sowcarpet"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
              <label className="input-label">Credit Terms (days)</label>
              <input
                className="input"
                type="number"
                value={creditTermDays}
                onChange={(e) => setCreditTermDays(e.target.value)}
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
              {submitting ? "Saving…" : "Save Supplier"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
