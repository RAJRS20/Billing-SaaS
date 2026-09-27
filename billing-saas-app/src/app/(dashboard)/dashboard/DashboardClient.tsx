"use client";

import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Users,
  ReceiptText,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardClientProps {
  userName: string;
  storeName: string;
  branchName: string;
  kpis: {
    todaySales: number;
    todayInvoices: number;
    todayGoldGrams: number;
    outstandingDues: number;
    customersWithDues: number;
    stockValue: number;
    stockPieces: number;
  };
  weeklyData: { day: string; sales: number; purchases: number }[];
  rates: {
    rate24K: number;
    rate22K: number;
    rate18K: number;
  };
  recentTransactions: {
    id: string;
    customer: string;
    items: string;
    amount: number;
    status: string;
    time: string;
    payment: string;
  }[];
  monthlySnapshot: {
    totalCustomers: number;
    invoicesThisMonth: number;
    avgInvoiceValue: number;
    advanceCollected: number;
  };
  lowStockAlerts: {
    product: string;
    sku: string;
    qty: number;
  }[];
}

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
      <div className="card p-3 text-sm shadow-lg border border-slate-200" style={{ minWidth: 160 }}>
        <p className="font-bold text-xs uppercase tracking-wider mb-2 text-slate-500">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="flex justify-between gap-4 py-0.5">
            <span className="text-slate-500 text-xs font-medium">{p.name}</span>
            <span className="font-semibold text-xs text-slate-900">
              {p.name === "rate" ? `₹${p.value}/g` : fmt(p.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardClient({
  userName,
  storeName,
  branchName,
  kpis,
  weeklyData,
  rates,
  recentTransactions,
  monthlySnapshot,
  lowStockAlerts,
}: DashboardClientProps) {
  const currentDateStr = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const goldData = [
    { time: "9am", rate: rates.rate22K - 40 },
    { time: "11am", rate: rates.rate22K - 15 },
    { time: "1pm", rate: rates.rate22K - 5 },
    { time: "3pm", rate: rates.rate22K },
    { time: "Current", rate: rates.rate22K },
  ];

  const kpiCards = [
    {
      label: "Today's Sales",
      value: fmt(kpis.todaySales),
      sub: `${kpis.todayInvoices} invoice${kpis.todayInvoices === 1 ? "" : "s"} issued`,
      change: kpis.todayInvoices > 0 ? `+${kpis.todayInvoices}` : "0",
      positive: true,
      icon: <ShoppingCart size={20} />,
      color: "#4f46e5",
      bg: "#eef2ff",
      border: "#c7d2fe",
    },
    {
      label: "Gold Sold (Today)",
      value: `${kpis.todayGoldGrams.toFixed(2)} g`,
      sub: "Net gold dispatched",
      change: kpis.todayGoldGrams > 0 ? "+Live" : "0.0 g",
      positive: true,
      icon: <Scale size={20} />,
      color: "#b45309",
      bg: "#fffbeb",
      border: "#fde68a",
    },
    {
      label: "Outstanding Dues",
      value: fmt(kpis.outstandingDues),
      sub: `From ${kpis.customersWithDues} customer${kpis.customersWithDues === 1 ? "" : "s"}`,
      change: kpis.customersWithDues > 0 ? "Receivable" : "Clear",
      positive: kpis.outstandingDues === 0,
      icon: <AlertCircle size={20} />,
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
    },
    {
      label: "Stock Value",
      value: kpis.stockValue > 10000000 
        ? `₹${(kpis.stockValue / 10000000).toFixed(2)} Cr`
        : `₹${(kpis.stockValue / 100000).toFixed(2)} Lakh`,
      sub: `${kpis.stockPieces} items in inventory`,
      change: "Audited",
      positive: true,
      icon: <Package size={20} />,
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },
  ];

  const quickStats = [
    { label: "Total Customers", value: monthlySnapshot.totalCustomers.toLocaleString("en-IN"), icon: <Users size={16} /> },
    { label: "Invoices This Month", value: monthlySnapshot.invoicesThisMonth.toLocaleString("en-IN"), icon: <ReceiptText size={16} /> },
    { label: "Avg. Invoice Value", value: fmt(monthlySnapshot.avgInvoiceValue), icon: <TrendingUp size={16} /> },
    { label: "Advance Collected", value: fmt(monthlySnapshot.advanceCollected), icon: <Zap size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Good day, {userName} 👋
          </h1>
          <p className="text-xs font-medium mt-1 text-slate-500">
            {currentDateStr} · {storeName} · {branchName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/billing" className="btn-gold shadow-sm" id="dashboard-new-bill-btn">
            <Zap size={16} /> New Bill
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`stat-card animate-fade-up stagger-${i + 1}`}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs"
                style={{ background: kpi.bg, color: kpi.color, borderColor: kpi.border }}
              >
                {kpi.icon}
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${
                  kpi.positive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {kpi.positive ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                {kpi.change}
              </span>
            </div>
            <div>
              <p
                className="text-2xl font-extrabold tracking-tight mt-1 text-slate-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {kpi.value}
              </p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {kpi.label}
              </p>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {kpi.sub}
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
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Live transactional volume · {branchName}
              </p>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-full inline-block bg-indigo-600" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-full inline-block bg-amber-500" />
                Purchases
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="sales-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="purchase-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#4f46e5" strokeWidth={2.5} fill="url(#sales-grad)" />
              <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#d97706" strokeWidth={2.5} fill="url(#purchase-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gold Rate Trend */}
        <div className="card p-5 animate-fade-up stagger-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="section-title">Gold Rate (22K)</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Authoritative market rate
                </p>
              </div>
              <span className="badge badge-success">Live</span>
            </div>
            <div className="mb-3">
              <p
                className="text-3xl font-extrabold text-gold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ₹{rates.rate22K.toLocaleString("en-IN")}
              </p>
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                ▲ Active Today
              </p>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={goldData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" name="rate" stroke="#d97706" strokeWidth={2} fill="url(#gold-grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["24K", `₹${rates.rate24K.toLocaleString("en-IN")}`],
              ["22K", `₹${rates.rate22K.toLocaleString("en-IN")}`],
              ["18K", `₹${rates.rate18K.toLocaleString("en-IN")}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl py-2 px-1 border" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
                <p className="text-xs font-bold text-amber-800">{v}</p>
                <p className="text-[10px] font-semibold text-amber-600 uppercase">{k}</p>
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
            <div>
              <h2 className="section-title">Recent Transactions</h2>
              <p className="text-xs text-slate-500 font-medium">Latest invoices generated across counters</p>
            </div>
            <a
              href="/invoices"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No invoices issued yet. Click &quot;New Bill&quot; to create your first sale.
              </div>
            ) : (
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
                    <tr key={txn.id} className="cursor-pointer transition-colors">
                      <td>
                        <div>
                          <p className="font-bold text-xs text-amber-800">
                            {txn.id}
                          </p>
                          <p className="text-[11px] flex items-center gap-1 mt-0.5 text-slate-400 font-medium">
                            <Clock size={11} /> {txn.time}
                          </p>
                        </div>
                      </td>
                      <td>
                        <p className="font-semibold text-sm text-slate-800">
                          {txn.customer}
                        </p>
                      </td>
                      <td>
                        <p className="text-xs max-w-[180px] truncate text-slate-500 font-medium">
                          {txn.items}
                        </p>
                      </td>
                      <td>
                        <p className="font-bold text-sm text-slate-900">
                          {fmt(txn.amount)}
                        </p>
                      </td>
                      <td>
                        <span className="badge badge-info text-[11px]">{txn.payment}</span>
                      </td>
                      <td>
                        {txn.status === "COMPLETED" ? (
                          <span className="badge badge-success text-[11px] flex items-center gap-1 w-fit">
                            <CheckCircle2 size={12} /> Done
                          </span>
                        ) : (
                          <span className="badge badge-gold text-[11px] flex items-center gap-1 w-fit">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Quick Stats */}
          <div className="card p-5 animate-fade-up stagger-5">
            <h2 className="section-title mb-4">Monthly Snapshot</h2>
            <div className="space-y-3.5">
              {quickStats.map((s) => (
                <div key={s.label} className="flex items-center justify-between pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">{s.icon}</span>
                    <span className="text-xs font-semibold text-slate-700">{s.label}</span>
                  </div>
                  <span className="font-bold text-sm text-slate-900">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card p-5 animate-fade-up stagger-6 border-red-200/80 bg-red-50/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-red-500" />
              <h2 className="section-title text-red-950">Low Stock Alerts</h2>
              <span className="badge badge-danger ml-auto">{lowStockAlerts.length}</span>
            </div>
            <div className="space-y-3">
              {lowStockAlerts.length === 0 ? (
                <p className="text-xs text-slate-500">All inventory items are well stocked.</p>
              ) : (
                lowStockAlerts.map((item) => (
                  <div key={item.sku} className="p-2.5 rounded-xl bg-white border border-red-100 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold leading-tight text-slate-800">
                          {item.product}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {item.sku}
                        </p>
                      </div>
                      <span className="badge badge-danger text-[11px] shrink-0 ml-2">
                        {item.qty} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <a
              href="/inventory"
              className="btn-outline w-full justify-center mt-4 text-xs font-bold border-red-200 text-red-700 hover:bg-red-50"
            >
              View All Stock
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
