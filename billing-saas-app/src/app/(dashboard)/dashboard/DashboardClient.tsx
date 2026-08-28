"use client";

import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Gem,
  Scale,
  Users,
  ReceiptText,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// ─── Mock data (will come from API in real implementation) ─────────────────
const salesData = [
  { day: "Mon", sales: 142000, purchases: 45000 },
  { day: "Tue", sales: 98000,  purchases: 12000 },
  { day: "Wed", sales: 225000, purchases: 67000 },
  { day: "Thu", sales: 187000, purchases: 23000 },
  { day: "Fri", sales: 310000, purchases: 89000 },
  { day: "Sat", sales: 415000, purchases: 120000 },
  { day: "Sun", sales: 278000, purchases: 44000 },
];

const goldData = [
  { time: "9am",  rate: 6080 },
  { time: "10am", rate: 6095 },
  { time: "11am", rate: 6110 },
  { time: "12pm", rate: 6105 },
  { time: "1pm",  rate: 6115 },
  { time: "2pm",  rate: 6120 },
  { time: "3pm",  rate: 6118 },
  { time: "4pm",  rate: 6125 },
];

const recentTransactions = [
  {
    id: "INV-2026-001",
    customer: "Priya Sharma",
    items: "22K Gold Necklace + Earrings",
    amount: 124580,
    status: "COMPLETED",
    time: "2 mins ago",
    payment: "UPI",
  },
  {
    id: "INV-2026-002",
    customer: "Ramesh Kumar",
    items: "18K Diamond Ring",
    amount: 87450,
    status: "COMPLETED",
    time: "18 mins ago",
    payment: "CASH",
  },
  {
    id: "INV-2026-003",
    customer: "Anjali Nair",
    items: "22K Gold Bangles (set of 2)",
    amount: 198200,
    status: "PENDING",
    time: "45 mins ago",
    payment: "CARD",
  },
  {
    id: "INV-2026-004",
    customer: "Walk-in Customer",
    items: "22K Gold Chain",
    amount: 56300,
    status: "COMPLETED",
    time: "1 hr ago",
    payment: "CASH",
  },
  {
    id: "INV-2026-005",
    customer: "Meena Patel",
    items: "Old Gold Exchange + New Pendant",
    amount: 34100,
    status: "COMPLETED",
    time: "2 hrs ago",
    payment: "MIXED",
  },
];

const lowStockAlerts = [
  { product: "22K Gold Chain (18\")", sku: "CH-22K-18", qty: 2 },
  { product: "18K Diamond Solitaire Ring", sku: "RG-18K-DS", qty: 1 },
  { product: "22K Gold Jhumka Earrings", sku: "ER-22K-JH", qty: 3 },
];

const kpis = [
  {
    label: "Today's Sales",
    value: "₹4,15,780",
    sub: "18 invoices",
    change: "+12.4%",
    positive: true,
    icon: <ShoppingCart size={20} />,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.25)",
    bg: "rgba(99,102,241,0.12)",
  },
  {
    label: "Gold Sold (Today)",
    value: "148.6 g",
    sub: "22K + 18K combined",
    change: "+8.2%",
    positive: true,
    icon: <Scale size={20} />,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.12)",
  },
  {
    label: "Outstanding Dues",
    value: "₹2,34,500",
    sub: "From 14 customers",
    change: "+3.1%",
    positive: false,
    icon: <AlertCircle size={20} />,
    color: "#ef4444",
    glow: "rgba(239,68,68,0.2)",
    bg: "rgba(239,68,68,0.1)",
  },
  {
    label: "Stock Value",
    value: "₹1.24 Cr",
    sub: "312 items across 8 categories",
    change: "-1.2%",
    positive: false,
    icon: <Package size={20} />,
    color: "#10b981",
    glow: "rgba(16,185,129,0.2)",
    bg: "rgba(16,185,129,0.1)",
  },
];

const quickStats = [
  { label: "Total Customers", value: "1,847", icon: <Users size={16} /> },
  { label: "Invoices This Month", value: "342", icon: <ReceiptText size={16} /> },
  { label: "Avg. Invoice Value", value: "₹68,240", icon: <TrendingUp size={16} /> },
  { label: "Advance Collected", value: "₹4,12,000", icon: <Zap size={16} /> },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 text-sm" style={{ minWidth: 160 }}>
        <p className="font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {p.name === "rate" ? `₹${p.value}/g` : fmt(p.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardClient() {
  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Good morning, Admin 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Thursday, 28 August 2026 · Sri Lakshmi Jewellers, Chennai
          </p>
        </div>
        <a href="/billing" className="btn-gold" id="dashboard-new-bill-btn">
          <Zap size={16} /> New Bill
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`stat-card animate-fade-up stagger-${i + 1}`}
            style={{ boxShadow: `0 0 24px ${kpi.glow}` }}
          >
            {/* Background glow blob */}
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
              style={{ background: kpi.color }}
            />
            <div className="flex items-start justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: kpi.bg, color: kpi.color }}
              >
                {kpi.icon}
              </div>
              <span
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                style={{
                  background: kpi.positive
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(239,68,68,0.12)",
                  color: kpi.positive ? "#34d399" : "#f87171",
                }}
              >
                {kpi.positive ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
                {kpi.change}
              </span>
            </div>
            <div>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
              >
                {kpi.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {kpi.sub}
              </p>
              <p
                className="text-sm font-medium mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {kpi.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales vs Purchases Chart */}
        <div className="card p-5 xl:col-span-2 animate-fade-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Weekly Sales & Purchases</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Current week · All branches
              </p>
            </div>
            <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: "#6366f1" }} />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: "#f59e0b" }} />
                Purchases
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="sales-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="purchase-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#6366f1" strokeWidth={2} fill="url(#sales-grad)" />
              <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#f59e0b" strokeWidth={2} fill="url(#purchase-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gold Rate Trend */}
        <div className="card p-5 animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Gold Rate (22K)</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Today's movement
              </p>
            </div>
            <span className="badge badge-success">Live</span>
          </div>
          <div className="mb-4">
            <p
              className="text-3xl font-bold text-gold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ₹6,120
            </p>
            <p className="text-sm" style={{ color: "#34d399" }}>
              ▲ ₹45 (+0.74%) today
            </p>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={goldData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" name="rate" stroke="#f59e0b" strokeWidth={2} fill="url(#gold-grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[["24K", "₹6,672"], ["22K", "₹6,120"], ["18K", "₹5,004"]].map(([k, v]) => (
              <div key={k} className="rounded-lg py-2 px-1" style={{ background: "rgba(245,158,11,0.08)" }}>
                <p className="text-xs font-bold text-gold">{v}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{k}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="card p-5 xl:col-span-2 animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Transactions</h2>
            <a
              href="/invoices"
              className="btn-ghost text-xs"
              style={{ color: "var(--gold-400)" }}
            >
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((txn) => (
                  <tr key={txn.id} className="cursor-pointer">
                    <td>
                      <div>
                        <p className="font-medium text-xs" style={{ color: "var(--gold-400)" }}>
                          {txn.id}
                        </p>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                          <Clock size={10} /> {txn.time}
                        </p>
                      </div>
                    </td>
                    <td>
                      <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                        {txn.customer}
                      </p>
                    </td>
                    <td>
                      <p className="text-xs max-w-[180px] truncate" style={{ color: "var(--text-secondary)" }}>
                        {txn.items}
                      </p>
                    </td>
                    <td>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {fmt(txn.amount)}
                      </p>
                    </td>
                    <td>
                      <span className="badge badge-info text-xs">{txn.payment}</span>
                    </td>
                    <td>
                      {txn.status === "COMPLETED" ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#34d399" }}>
                          <CheckCircle2 size={13} /> Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#fbbf24" }}>
                          <Clock size={13} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Quick Stats */}
          <div className="card p-5 animate-fade-up stagger-5">
            <h2 className="section-title mb-4">Monthly Snapshot</h2>
            <div className="space-y-3">
              {quickStats.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    {s.icon}
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card p-5 animate-fade-up stagger-6" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} style={{ color: "#f87171" }} />
              <h2 className="section-title">Low Stock Alerts</h2>
              <span className="badge badge-danger ml-auto">{lowStockAlerts.length}</span>
            </div>
            <div className="space-y-3">
              {lowStockAlerts.map((item) => (
                <div key={item.sku}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>
                        {item.product}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.sku}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ml-2"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                    >
                      {item.qty} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/inventory"
              className="btn-outline w-full justify-center mt-4 text-xs"
              style={{ borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}
            >
              View All Stock
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
