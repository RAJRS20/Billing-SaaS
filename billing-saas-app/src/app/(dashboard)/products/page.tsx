"use client";
import { Plus, Search, Gem, Filter } from "lucide-react";

const products = [
  { name: "22K Gold Necklace (Classic)", sku: "NK-22K-001", category: "Necklace", purity: "22K", grossWeight: 18.5, stock: 4, price: 142800 },
  { name: "18K Diamond Ring (Solitaire)", sku: "RG-18K-001", category: "Ring", purity: "18K", grossWeight: 4.2, stock: 2, price: 87450 },
  { name: "22K Gold Bangles (Pair)", sku: "BG-22K-001", category: "Bangle", purity: "22K", grossWeight: 32.8, stock: 6, price: 245600 },
  { name: "22K Gold Jhumka Earrings", sku: "ER-22K-001", category: "Earring", purity: "22K", grossWeight: 8.6, stock: 3, price: 68200 },
  { name: "22K Gold Chain (18 inch)", sku: "CH-22K-001", category: "Chain", purity: "22K", grossWeight: 9.2, stock: 2, price: 72400 },
  { name: "22K Gold Pendant", sku: "PD-22K-001", category: "Pendant", purity: "22K", grossWeight: 5.4, stock: 8, price: 42000 },
];

export default function ProductsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Products
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {products.length} products · Manage jewellery master data
          </p>
        </div>
        <button className="btn-gold" id="add-product-btn">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input className="input pl-9" placeholder="Search products…" id="products-search" />
        </div>
        <button className="btn-outline gap-2"><Filter size={15} /> Filter</button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Purity</th>
              <th>Gross Wt</th>
              <th>Stock</th>
              <th>Base Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} className="cursor-pointer">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
                      <Gem size={14} style={{ color: "var(--gold-400)" }} />
                    </div>
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                  </div>
                </td>
                <td><span className="badge badge-info">{p.sku}</span></td>
                <td style={{ color: "var(--text-secondary)" }}>{p.category}</td>
                <td><span className="badge badge-gold">{p.purity}</span></td>
                <td style={{ color: "var(--text-secondary)" }}>{p.grossWeight}g</td>
                <td>
                  <span className={`badge ${p.stock <= 2 ? "badge-danger" : "badge-success"}`}>
                    {p.stock} pcs
                  </span>
                </td>
                <td className="font-semibold text-gold">₹{p.price.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
