"use client";
import { Plus, Search, Phone, Mail } from "lucide-react";

const customers = [
  { name: "Priya Sharma", phone: "9876543210", city: "Chennai", totalPurchases: 4, outstanding: 0, lifetime: 498000 },
  { name: "Ramesh Kumar", phone: "9765432109", city: "Chennai", totalPurchases: 7, outstanding: 24500, lifetime: 872000 },
  { name: "Anjali Nair", phone: "9654321098", city: "Coimbatore", totalPurchases: 2, outstanding: 198200, lifetime: 198200 },
  { name: "Meena Patel", phone: "9543210987", city: "Chennai", totalPurchases: 12, outstanding: 0, lifetime: 1240000 },
  { name: "Suresh Iyer", phone: "9432109876", city: "Salem", totalPurchases: 3, outstanding: 56000, lifetime: 345000 },
];

export default function CustomersPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Customers
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {customers.length} customers · Manage ledger and advances
          </p>
        </div>
        <button className="btn-gold" id="add-customer-btn"><Plus size={16} /> Add Customer</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input className="input pl-9" placeholder="Search customers by name or phone…" id="customers-search" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>City</th>
              <th>Purchases</th>
              <th>Outstanding</th>
              <th>Lifetime Value</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.phone} className="cursor-pointer">
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "var(--gradient-gold)", color: "#fff" }}
                    >
                      {c.name[0]}
                    </div>
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <Phone size={11} /> {c.phone}
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{c.city}</td>
                <td><span className="badge badge-info">{c.totalPurchases}</span></td>
                <td>
                  {c.outstanding > 0 ? (
                    <span className="font-semibold" style={{ color: "#f87171" }}>₹{c.outstanding.toLocaleString("en-IN")}</span>
                  ) : (
                    <span className="badge badge-success">Nil</span>
                  )}
                </td>
                <td className="font-semibold text-gold">₹{c.lifetime.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
