"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  RefreshCw,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Gem,
  TrendingUp,
  ChevronRight,
  Boxes,
  Receipt,
  Wallet,
} from "lucide-react";

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { href: "/gold-rates", label: "Gold Rates", icon: <TrendingUp size={18} /> },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/billing", label: "New Bill / POS", icon: <ShoppingCart size={18} /> },
      { href: "/invoices", label: "Invoices", icon: <Receipt size={18} /> },
      { href: "/estimates", label: "Estimates", icon: <FileText size={18} /> },
      { href: "/returns", label: "Returns", icon: <RefreshCw size={18} /> },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/products", label: "Products", icon: <Gem size={18} /> },
      { href: "/inventory", label: "Stock", icon: <Boxes size={18} /> },
      { href: "/purchases", label: "Purchases", icon: <Truck size={18} /> },
      { href: "/old-gold", label: "Old Gold", icon: <Package size={18} /> },
    ],
  },
  {
    title: "Accounts",
    items: [
      { href: "/customers", label: "Customers", icon: <Users size={18} /> },
      { href: "/suppliers", label: "Suppliers", icon: <Truck size={18} /> },
      { href: "/orders", label: "Orders & Advances", icon: <Wallet size={18} /> },
      { href: "/expenses", label: "Expenses", icon: <Receipt size={18} /> },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/reports", label: "Reports", icon: <BarChart3 size={18} /> },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-screen w-64 shrink-0 border-r overflow-y-auto"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-gold)" }}
        >
          <Gem size={18} className="text-white" />
        </div>
        <div>
          <p
            className="font-bold text-base leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            JewelBill
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            SaaS Platform
          </p>
        </div>
      </div>

      {/* Shop badge */}
      <div className="px-4 py-3">
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer group transition-all"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse-gold"
              style={{ background: "var(--gold-400)" }}
            />
            <span className="text-sm font-medium" style={{ color: "var(--gold-400)" }}>
              Sri Lakshmi Jewellers
            </span>
          </div>
          <ChevronRight size={14} style={{ color: "var(--gold-500)" }} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-5 overflow-y-auto">
        {NAV.map((section) => (
          <div key={section.title}>
            <p
              className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <ChevronRight
                        size={14}
                        className="ml-auto"
                        style={{ color: "var(--gold-500)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group"
          style={{ background: "var(--bg-card)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "var(--gradient-gold)", color: "#fff" }}
          >
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              Admin User
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              Shop Owner
            </p>
          </div>
          <button className="btn-ghost p-1 rounded-lg">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
