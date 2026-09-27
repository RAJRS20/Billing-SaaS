"use client";

import { useState } from "react";
import { Gem, Eye, EyeOff, LogIn, Zap } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "admin@srilakshmi.in", password: "demo1234" });
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
        setLoading(false);
      }
    } catch {
      setError("An error occurred during sign in");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(circle at 50% 0%, #fffbeb 0%, #fef3c7 25%, #f8fafc 65%, #f1f5f9 100%)",
      }}
    >
      {/* Decorative ambient gold orbs */}
      <div
        className="fixed -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none blur-3xl opacity-40"
        style={{
          background: "radial-gradient(circle, #fde68a 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none blur-3xl opacity-30"
        style={{
          background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-sm animate-scale-in relative z-10">
        {/* Card */}
        <div
          className="card-glass p-8"
          style={{
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.9)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 animate-pulse-gold shadow-md"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Gem size={26} className="text-white" />
            </div>
            <h1
              className="text-2xl font-extrabold text-gold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              JewelBill SaaS
            </h1>
            <p className="text-xs font-medium mt-1 text-slate-500">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword(!showPassword)}
                  id="toggle-password"
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div
                className="p-3 rounded-xl text-xs text-red-700 border border-red-200"
                style={{ background: "#fef2f2" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-gold w-full justify-center py-3 text-base shadow-md"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
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
            className="mt-6 p-3 rounded-xl text-center border"
            style={{ background: "#fffbeb", borderColor: "#fde68a" }}
          >
            <p className="text-xs font-medium" style={{ color: "#92400e" }}>
              <Zap
                size={12}
                className="inline mr-1 text-amber-600"
              />
              Demo Account: <strong>admin@srilakshmi.in</strong> / <strong>demo1234</strong>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6 font-medium text-slate-400">
          © 2026 JewelBill SaaS · All rights reserved
        </p>
      </div>
    </div>
  );
}
