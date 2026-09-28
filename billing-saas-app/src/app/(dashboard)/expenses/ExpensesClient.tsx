"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, ChevronDown, X, Check,
  IndianRupee, Calendar, TrendingUp, Receipt,
  CreditCard, Banknote, Building2, Truck,
  Zap, PackageCheck, Megaphone, Landmark, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, BarChart3,
} from "lucide-react";
import { createExpenseAction } from "@/app/actions/expenses";
import Modal from "@/components/Modal";

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string;
  reference: string;
}

interface ExpensesClientProps {
  initialExpenses: ExpenseRecord[];
  categories: { id: string; name: string }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ExpensesClient({ initialExpenses, categories }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    description: "",
    categoryId: categories[0]?.id || "",
    amount: "",
    method: "CASH",
    reference: "",
  });

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        searchQuery === "" ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === "ALL" || e.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const cashExpenses = useMemo(
    () => expenses.filter((e) => e.method === "CASH").reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const digitalExpenses = totalExpenses - cashExpenses;

  // Category summary
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) {
      map.set(c.name, 0);
    }
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return categories.map((c) => ({
      name: c.name,
      total: map.get(c.name) ?? 0,
    }));
  }, [categories, expenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(form.amount);
    if (!form.description.trim()) {
      setErrorMsg("Please enter an expense description.");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMsg("Expense amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const res = await createExpenseAction({
      description: form.description,
      categoryId: form.categoryId,
      amount: numAmount,
      method: form.method as any,
      reference: form.reference,
    });

    setIsSubmitting(false);

    if (!res.success || !res.expense) {
      setErrorMsg(res.error || "Failed to record expense.");
      return;
    }

    const catName = categories.find((c) => c.id === form.categoryId)?.name || "Miscellaneous";
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());

    const newRecord: ExpenseRecord = {
      id: res.expense.id,
      date: dateStr,
      category: catName,
      description: res.expense.description,
      amount: Number(res.expense.amount),
      method: res.expense.method,
      reference: res.expense.reference || "",
    };

    setExpenses([newRecord, ...expenses]);
    setShowAddModal(false);
    setForm({
      description: "",
      categoryId: categories[0]?.id || "",
      amount: "",
      method: "CASH",
      reference: "",
    });
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Showroom Operating Expenses
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {expenses.length} entries · Track store operational expenses with double-entry accounting journals
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="new-expense-btn"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Expenses",
            value: fmt(totalExpenses),
            sub: "Total period outflow",
            icon: <Receipt size={18} />,
            color: "#dc2626",
            bg: "#fef2f2",
            border: "#fecaca",
          },
          {
            label: "Cash Expenses",
            value: fmt(cashExpenses),
            sub: `${expenses.filter((e) => e.method === "CASH").length} cash vouchers`,
            icon: <Banknote size={18} />,
            color: "#b45309",
            bg: "#fffbeb",
            border: "#fde68a",
          },
          {
            label: "Digital Payments",
            value: fmt(digitalExpenses),
            sub: "UPI + Card + Bank",
            icon: <CreditCard size={18} />,
            color: "#4f46e5",
            bg: "#eef2ff",
            border: "#c7d2fe",
          },
          {
            label: "Categories",
            value: categories.length.toString(),
            sub: "Active categories",
            icon: <BarChart3 size={18} />,
            color: "#059669",
            bg: "#ecfdf5",
            border: "#a7f3d0",
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

      {/* Category Breakdown */}
      <div className="card p-5">
        <h3 className="section-title mb-3">Expense by Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categoryTotals.map((cat) => (
            <div
              key={cat.name}
              className={`rounded-xl p-3 border cursor-pointer transition-all hover:shadow-xs ${
                categoryFilter === cat.name ? "bg-amber-50/60 border-amber-300" : "bg-white border-slate-200"
              }`}
              onClick={() => setCategoryFilter(cat.name === categoryFilter ? "ALL" : cat.name)}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-700">{cat.name}</span>
              </div>
              <p
                className="text-sm font-extrabold text-slate-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {fmt(cat.total)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Table */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="search-wrapper flex-1 min-w-[240px]">
            <Search size={16} className="search-icon-left" />
            <input
              type="text"
              placeholder="Search by description or category..."
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
          {categoryFilter !== "ALL" && (
            <button
              onClick={() => setCategoryFilter("ALL")}
              className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1"
            >
              Filter: {categoryFilter} <X size={12} />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment Mode</th>
                <th>Reference</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No expense vouchers recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-medium text-xs text-slate-800">{e.date}</td>
                    <td>
                      <span className="badge badge-gold text-[10px]">{e.category}</span>
                    </td>
                    <td className="text-xs font-semibold text-slate-800">{e.description}</td>
                    <td>
                      <span className="badge badge-info text-[10px]">{e.method}</span>
                    </td>
                    <td className="font-mono text-xs text-slate-400">{e.reference || "—"}</td>
                    <td className="text-right font-bold text-xs text-slate-900">{fmt(e.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Showroom Expense"
        icon={<Receipt className="text-amber-600" size={18} />}
        maxWidth="max-w-md"
      >
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expense Description *</label>
                <input
                  required
                  className="input text-xs w-full"
                  placeholder="e.g. BIS Hallmarking fee for 10 bangles"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    className="input text-xs w-full bg-white"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input text-xs font-bold w-full"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    className="input text-xs w-full bg-white"
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                  >
                    <option value="CASH">Cash (Petty Drawer)</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reference / Voucher #</label>
                  <input
                    className="input text-xs w-full"
                    placeholder="e.g. VCH-0941"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
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
                  {isSubmitting ? "Recording..." : "Save Voucher"}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
