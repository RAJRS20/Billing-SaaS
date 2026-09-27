"use client";

import { Bell, Search, Menu, X, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export default function Header({ onMenuToggle, mobileMenuOpen }: HeaderProps) {
  const [goldRate] = useState("₹6,120/g");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className="flex items-center gap-4 px-6 py-3.5 border-b sticky top-0 z-30 shadow-xs"
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        borderColor: "var(--border)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden btn-ghost p-2"
        id="mobile-menu-toggle"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Global Search */}
      <div className="search-wrapper max-w-md hidden sm:flex relative flex-1">
        <Search
          size={16}
          className="search-icon-left"
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search products, invoices, customers…"
          className="input search-input pr-16 py-2 text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-all shadow-xs"
          id="global-search"
          aria-label="Search products, invoices, customers"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-wider text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 pointer-events-none select-none">
          Ctrl K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Live Gold Rate Badge */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border"
          style={{
            background: "#fffbeb",
            borderColor: "#fde68a",
          }}
        >
          <Zap size={14} style={{ color: "var(--gold-600)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--gold-800)" }}>
            22K Gold:
          </span>
          <span className="text-sm font-bold text-gold">{goldRate}</span>
          <span
            className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}
          >
            ↑ 0.8%
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative btn-ghost p-2.5 rounded-xl hover:bg-slate-100"
          id="notifications-btn"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--gold-500)" }}
          />
        </button>

        {/* Quick Action — New Bill */}
        <a href="/billing" className="btn-gold hidden sm:inline-flex shadow-sm" id="header-new-bill-btn">
          <Zap size={15} />
          New Bill
        </a>
      </div>
    </header>
  );
}
