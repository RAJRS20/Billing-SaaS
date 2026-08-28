"use client";

import { useState } from "react";
import { Gem, Eye, EyeOff, LogIn, Zap } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "admin@srilakshmi.in", password: "demo1234" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login — replace with real API call
    await new Promise((r) => setTimeout(r, 1200));
    window.location.href = "/dashboard";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0f0e17 0%, #1a1040 50%, #0f0e17 100%)",
      }}
    >
      {/* Background decoration */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-sm animate-scale-in">
        {/* Card */}
        <div
          className="card-glass p-8"
          style={{
            boxShadow: "0 0 80px rgba(245,158,11,0.1), 0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-pulse-gold"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Gem size={26} className="text-white" />
            </div>
            <h1
              className="text-2xl font-bold text-gold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              JewelBill SaaS
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Gold Jewellery Billing & Inventory
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@yourshop.in"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  id="toggle-password"
                >
                  {showPassword ? (
                    <EyeOff size={16} style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Eye size={16} style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-xs"
                style={{ color: "var(--gold-400)" }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn-gold w-full justify-center py-3 text-base"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} /> Sign In
                </span>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div
            className="mt-6 p-3 rounded-xl text-center"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <Zap
                size={11}
                className="inline mr-1"
                style={{ color: "var(--gold-400)" }}
              />
              Demo: admin@srilakshmi.in / demo1234
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          © 2026 JewelBill SaaS · All rights reserved
        </p>
      </div>
    </div>
  );
}
