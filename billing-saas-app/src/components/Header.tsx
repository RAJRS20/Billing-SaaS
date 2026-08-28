"use client";

import { Bell, Search, Menu, X, Zap } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export default function Header({ onMenuToggle, mobileMenuOpen }: HeaderProps) {
  const [goldRate] = useState("₹6,120/g"); // Would come from API

  return (
    <header
      className="flex items-center gap-4 px-6 py-4 border-b sticky top-0 z-30"
      style={{
        background: "rgba(26,24,38,0.85)",
        borderColor: "var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden btn-ghost p-2"
        id="mobile-menu-toggle"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search products, invoices, customers..."
          className="input pl-9 py-2 text-sm"
          id="global-search"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Live Gold Rate Badge */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <Zap size={14} style={{ color: "var(--gold-400)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            22K Gold:
          </span>
          <span className="text-sm font-bold text-gold">{goldRate}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}
          >
            ↑ 0.8%
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative btn-ghost p-2 rounded-xl"
          id="notifications-btn"
        >
          <Bell size={20} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: "var(--gold-500)" }}
          />
        </button>

        {/* Quick Action — New Bill */}
        <a href="/billing" className="btn-gold hidden sm:inline-flex">
          <Zap size={15} />
          New Bill
        </a>
      </div>
    </header>
  );
}
