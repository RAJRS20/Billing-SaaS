"use client";
import { TrendingUp, Plus, Clock, ArrowUp, ArrowDown } from "lucide-react";

const rates = [
  { purity: "24K", rate: 6672, change: 48, pct: 0.72 },
  { purity: "22K", rate: 6120, change: 44, pct: 0.72 },
  { purity: "18K", rate: 5004, change: 36, pct: 0.72 },
  { purity: "14K", rate: 3894, change: 28, pct: 0.72 },
];

const history = [
  { date: "28 Aug 2026", "24K": 6672, "22K": 6120, updatedBy: "Admin", time: "09:00 AM" },
  { date: "27 Aug 2026", "24K": 6624, "22K": 6076, updatedBy: "Admin", time: "09:15 AM" },
  { date: "26 Aug 2026", "24K": 6588, "22K": 6043, updatedBy: "Manager", time: "09:00 AM" },
  { date: "25 Aug 2026", "24K": 6600, "22K": 6055, updatedBy: "Admin", time: "08:45 AM" },
  { date: "24 Aug 2026", "24K": 6540, "22K": 5996, updatedBy: "Admin", time: "09:30 AM" },
];

export default function GoldRatesPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Gold Rates
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Manage daily gold rates by purity. Rate locked on invoice creation.
          </p>
        </div>
        <button className="btn-gold" id="update-gold-rate-btn">
          <Plus size={16} /> Update Rate
        </button>
      </div>

      {/* Current Rates Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {rates.map((r, i) => (
          <div
            key={r.purity}
            className={`stat-card animate-fade-up stagger-${i + 1}`}
            style={{ boxShadow: "0 0 24px rgba(245,158,11,0.15)" }}
          >
            <div className="flex items-center justify-between">
              <span className="badge badge-gold">{r.purity}</span>
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: "#34d399" }}>
                <ArrowUp size={12} /> {r.pct}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gold mt-2" style={{ fontFamily: "var(--font-display)" }}>
              ₹{r.rate.toLocaleString("en-IN")}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>per gram · +₹{r.change} today</p>
          </div>
        ))}
      </div>

      {/* Rate History */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} style={{ color: "var(--text-muted)" }} />
          <h2 className="section-title">Rate History</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>24K Rate</th>
              <th>22K Rate</th>
              <th>Updated By</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.date}>
                <td className="font-medium" style={{ color: "var(--text-primary)" }}>{h.date}</td>
                <td className="font-semibold text-gold">₹{h["24K"].toLocaleString("en-IN")}</td>
                <td className="font-semibold" style={{ color: "var(--text-secondary)" }}>₹{h["22K"].toLocaleString("en-IN")}</td>
                <td style={{ color: "var(--text-secondary)" }}>{h.updatedBy}</td>
                <td style={{ color: "var(--text-muted)" }}>{h.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
