"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, Plus, Clock, ArrowUp, ArrowDown, Scale, Check, X, ShieldCheck } from "lucide-react";
import { updateGoldRatesAction } from "@/app/actions/gold-rates";
import Modal from "@/components/Modal";

export interface RateItem {
  purityId: string;
  metalId: string;
  purity: string;
  fineness: number;
  rate: number;
  change: number;
  pct: number;
}

export interface RateHistoryItem {
  date: string;
  rate24K: number;
  rate22K: number;
  updatedBy: string;
  time: string;
}

interface GoldRatesClientProps {
  currentRates: RateItem[];
  history: RateHistoryItem[];
  availablePurities: { id: string; name: string; fineness: number; metalId: string }[];
}

export default function GoldRatesClient({
  currentRates,
  history,
  availablePurities,
}: GoldRatesClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rate inputs keyed by purityId
  const [rateInputs, setRateInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const p of availablePurities) {
      const existing = currentRates.find((r) => r.purityId === p.id);
      initial[p.id] = existing ? existing.rate : Math.round(Number(p.fineness) * 6672);
    }
    return initial;
  });

  const handle24KChange = (val: number) => {
    const p24 = availablePurities.find((p) => p.name.includes("24"));
    const updated: Record<string, number> = { ...rateInputs };
    if (p24) {
      updated[p24.id] = val;
    }
    for (const p of availablePurities) {
      if (!p.name.includes("24")) {
        updated[p.id] = Math.round(val * Number(p.fineness));
      }
    }
    setRateInputs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const ratesToSubmit = availablePurities.map((p) => ({
      purityId: p.id,
      metalId: p.metalId,
      ratePerGram: rateInputs[p.id] || 0,
    }));

    const res = await updateGoldRatesAction(ratesToSubmit);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update rates.");
      return;
    }

    setSuccessMsg("Gold rates updated and locked across all active billing counters!");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("gold-rate-updated"));
    }
    setTimeout(() => {
      setSuccessMsg("");
      setShowModal(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Gold Rates
            </h1>
            <span className="badge badge-success text-xs">Live Engine</span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Authoritative daily gold rates by karatage fineness. Rate snapshot is immutably locked upon invoice creation.
          </p>
        </div>
        <button
          className="btn-gold"
          id="update-gold-rate-btn"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} /> Update Daily Rates
        </button>
      </div>

      {/* Current Rates Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {currentRates.map((r, i) => (
          <div
            key={r.purity}
            className={`stat-card animate-fade-up stagger-${i + 1}`}
          >
            <div className="flex items-center justify-between">
              <span className="badge badge-gold">{r.purity}</span>
              <span className="badge badge-success text-[11px] flex items-center gap-1">
                <ArrowUp size={11} /> {r.pct}%
              </span>
            </div>
            <p
              className="text-2xl font-extrabold text-gold mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ₹{r.rate.toLocaleString("en-IN")}
            </p>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              per gram · Fineness: {(r.fineness * 1000).toFixed(0)}/1000
            </p>
          </div>
        ))}
      </div>

      {/* Rate History */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} style={{ color: "var(--text-muted)" }} />
          <h2 className="section-title">Rate History & Audit Trail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Effective Date</th>
                <th>24K Rate</th>
                <th>22K Rate</th>
                <th>Updated By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                    No historical rate updates logged yet.
                  </td>
                </tr>
              ) : (
                history.map((h, idx) => (
                  <tr key={idx}>
                    <td className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {h.date}
                    </td>
                    <td className="font-semibold text-gold">₹{h.rate24K.toLocaleString("en-IN")}</td>
                    <td className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                      ₹{h.rate22K.toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{h.updatedBy}</td>
                    <td style={{ color: "var(--text-muted)" }}>{h.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Rate Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Update Today's Gold Rates"
        icon={<Scale className="text-amber-600" size={20} />}
        maxWidth="max-w-lg"
      >
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="font-bold text-base text-slate-800">Rates Published!</h3>
            <p className="text-xs text-slate-500">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <p className="font-semibold">Authoritative Pricing Note:</p>
              <p className="mt-0.5 text-amber-800">
                Changing the 24K bullion rate will automatically calculate 22K, 18K, and 14K based on standard BIS fineness.
              </p>
            </div>

            <div className="space-y-3">
              {availablePurities.map((p) => {
                const is24K = p.name.includes("24");
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-slate-50"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-400">
                        Fineness: {(Number(p.fineness) * 1000).toFixed(0)}/1000
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">₹</span>
                      <input
                        type="number"
                        required
                        min="1000"
                        value={rateInputs[p.id] || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (is24K) {
                            handle24KChange(val);
                          } else {
                            setRateInputs({ ...rateInputs, [p.id]: val });
                          }
                        }}
                        className="input text-xs font-bold text-right py-1 px-2 w-28 bg-white"
                      />
                      <span className="text-xs font-semibold text-slate-500">/g</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-outline text-xs px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-gold text-xs px-4"
              >
                {isSubmitting ? "Publishing..." : "Publish & Lock Rates"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
