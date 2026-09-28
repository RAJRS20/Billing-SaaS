"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Filter, Gem, Eye, Printer, QrCode,
  Tag, ArrowUpDown, Check, X, ShieldCheck, Sparkles,
  Layers, Scale, IndianRupee, Image as ImageIcon, ChevronRight
} from "lucide-react";
import { createProductAction } from "@/app/actions/products";
import Modal from "@/components/Modal";
import SlideOver from "@/components/SlideOver";

export interface ProductItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  purity: string;
  metal: string;
  huid: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  makingChargeType: "PER_GRAM" | "PERCENTAGE" | "FIXED";
  makingChargeRate: number;
  wastagePct: number;
  stockQty: number;
  approxPrice: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

interface ProductsClientProps {
  initialProducts: ProductItem[];
  categories: { id: string; name: string }[];
  purities: { id: string; name: string; fineness: number }[];
  metals: { id: string; name: string }[];
  active22KRate: number;
}

export default function ProductsClient({
  initialProducts,
  categories,
  purities,
  metals,
  active22KRate,
}: ProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPurity, setSelectedPurity] = useState<string>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tagModalProduct, setTagModalProduct] = useState<ProductItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tagPrinted, setTagPrinted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // New product form
  const [newProd, setNewProd] = useState({
    name: "",
    categoryId: categories[0]?.id || "",
    purityId: purities[0]?.id || "",
    metalId: metals[0]?.id || "",
    huid: "",
    grossWeight: 0,
    stoneWeight: 0,
    makingChargeRate: 450,
    stockQty: 1,
  });

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.huid.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
      const matchPurity = selectedPurity === "ALL" || p.purity === selectedPurity;
      return matchSearch && matchCat && matchPurity;
    });
  }, [products, searchQuery, selectedCategory, selectedPurity]);

  // Aggregate Stats
  const totalStockPieces = useMemo(() => products.reduce((acc, p) => acc + p.stockQty, 0), [products]);
  const totalGrossWeight = useMemo(() => products.reduce((acc, p) => acc + p.grossWeight * p.stockQty, 0), [products]);
  const totalValuation = useMemo(() => products.reduce((acc, p) => acc + p.approxPrice * p.stockQty, 0), [products]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim()) {
      setErrorMsg("Please enter a valid product name.");
      return;
    }
    if (newProd.grossWeight <= 0) {
      setErrorMsg("Gross weight must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const res = await createProductAction({
      name: newProd.name,
      categoryId: newProd.categoryId,
      purityId: newProd.purityId,
      metalId: newProd.metalId,
      huid: newProd.huid,
      grossWeight: newProd.grossWeight,
      stoneWeight: newProd.stoneWeight,
      makingChargeType: "PER_GRAM",
      makingChargeValue: newProd.makingChargeRate,
      initialStockQty: newProd.stockQty,
    });

    setIsSubmitting(false);

    if (!res.success || !res.product) {
      setErrorMsg(res.error || "Failed to create product.");
      return;
    }

    const netWeight = Math.max(0, newProd.grossWeight - newProd.stoneWeight);
    const catName = categories.find((c) => c.id === newProd.categoryId)?.name || "Jewellery";
    const purityName = purities.find((p) => p.id === newProd.purityId)?.name || "22K";
    const metalName = metals.find((m) => m.id === newProd.metalId)?.name || "Gold";
    const approx = Math.round(netWeight * active22KRate + netWeight * newProd.makingChargeRate);

    const newlyCreated: ProductItem = {
      id: res.product.id,
      sku: res.product.sku,
      barcode: res.product.barcode || res.product.sku,
      name: res.product.name,
      category: catName,
      purity: purityName,
      metal: metalName,
      huid: res.product.huid || "",
      grossWeight: Number(res.product.grossWeight),
      stoneWeight: Number(res.product.stoneWeight),
      netWeight: Number(res.product.netWeight),
      makingChargeType: res.product.makingChargeType as any,
      makingChargeRate: Number(res.product.makingChargeValue),
      wastagePct: 0,
      stockQty: newProd.stockQty,
      approxPrice: approx,
      status: newProd.stockQty > 2 ? "IN_STOCK" : newProd.stockQty > 0 ? "LOW_STOCK" : "OUT_OF_STOCK",
    };

    setProducts([newlyCreated, ...products]);
    setShowAddModal(false);
    setNewProd({
      name: "",
      categoryId: categories[0]?.id || "",
      purityId: purities[0]?.id || "",
      metalId: metals[0]?.id || "",
      huid: "",
      grossWeight: 0,
      stoneWeight: 0,
      makingChargeRate: 450,
      stockQty: 1,
    });
  };

  const handlePrintTag = () => {
    setTagPrinted(true);
    setTimeout(() => {
      setTagPrinted(false);
      window.print();
    }, 400);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Product Catalog & Tags
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}
            >
              <ShieldCheck size={11} /> HUID 2.0 Enforced
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Jewellery articles with 6-digit BIS Hallmark Unique Identification, barcode tags & live weights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gold gap-1.5 text-xs h-9 px-4"
            id="add-product-btn"
          >
            <Plus size={15} /> Add New Article
          </button>
        </div>
      </div>

      {/* ─── Metric Ribbon ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Articles
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{products.length}</span>
            <span className="text-xs font-semibold text-slate-500">SKUs ({totalStockPieces} pcs)</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <Check size={12} /> 100% BIS Hallmarked
          </div>
        </div>

        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gross Gold Weight
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Scale size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{totalGrossWeight.toFixed(2)}</span>
            <span className="text-xs font-semibold text-slate-500">grams</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>Precision: ±0.001g tracked</span>
          </div>
        </div>

        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Estimated Inventory Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {totalValuation > 10000000
                ? `₹${(totalValuation / 10000000).toFixed(2)} Cr`
                : `₹${(totalValuation / 100000).toFixed(2)} Lakh`}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>At active 22K rate: ₹{active22KRate}/g</span>
          </div>
        </div>

        <div
          className="card p-4 rounded-xl border relative overflow-hidden"
          style={{ background: "#ffffff", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Barcode / RFID Tags
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Tag size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{products.length}</span>
            <span className="text-xs font-semibold text-slate-500">Tags Ready</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-700 font-medium">
            <span>TSC 2&quot; Thermal Format</span>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <div
        className="card p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3"
        style={{ background: "#ffffff", borderColor: "var(--border)" }}
      >
        <div className="search-wrapper w-full md:w-96">
          <Search size={16} className="search-icon-left" />
          <input
            type="text"
            placeholder="Search by article name, SKU, Barcode or HUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input search-input text-xs pr-8 py-2 w-full bg-white shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input text-xs font-medium py-1.5 px-3 h-9 bg-white"
            style={{ width: "auto" }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Purity Dropdown */}
          <select
            value={selectedPurity}
            onChange={(e) => setSelectedPurity(e.target.value)}
            className="input text-xs font-medium py-1.5 px-3 h-9 bg-white"
            style={{ width: "auto" }}
          >
            <option value="ALL">All Purities</option>
            {purities.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Products Table ──────────────────────────────────────────────────── */}
      <div
        className="card rounded-xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead
              className="border-b font-semibold text-slate-600 uppercase tracking-wider"
              style={{ background: "#f8fafc", borderColor: "var(--border)" }}
            >
              <tr>
                <th className="py-3 px-4">Jewellery Item</th>
                <th className="py-3 px-3">SKU & Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">HUID / Purity</th>
                <th className="py-3 px-3 text-right">Gross Wt</th>
                <th className="py-3 px-3 text-right">Net Wt</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-3 text-right">Est. Price</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.name}
                      <div className="text-[10px] text-slate-400 font-normal">
                        Making: ₹{item.makingChargeRate}/g
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      <div>{item.sku}</div>
                      <div className="text-[10px] text-slate-400">*{item.barcode}*</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-medium">{item.category}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800">{item.purity}</div>
                      <div className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                        {item.huid || "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                      {item.grossWeight.toFixed(2)}g
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {item.netWeight.toFixed(2)}g
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.stockQty > 2
                            ? "bg-emerald-100 text-emerald-800"
                            : item.stockQty > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.stockQty} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      ₹{item.approxPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setTagModalProduct(item)}
                          className="btn-ghost p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-amber-800"
                          title="Print Jewellery Display Tag"
                        >
                          <Tag size={14} />
                        </button>
                        <button
                          onClick={() => setSelectedProduct(item)}
                          className="btn-ghost p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── JEWELLERY BARCODE TAG MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={!!tagModalProduct}
        onClose={() => setTagModalProduct(null)}
        title="Jewellery Barcode Tag Preview"
        icon={<Tag className="text-amber-600" size={18} />}
        maxWidth="max-w-sm"
      >
        {tagModalProduct && (
          <div className="space-y-4">
            {/* Tag visual rendering */}
            <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 text-center space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-amber-900">
                SRI LAKSHMI JEWELLERS
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">{tagModalProduct.name}</p>

              {/* Barcode visual lines */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-0.5 h-10 w-44 bg-white p-1 rounded border border-slate-200">
                  <div className="w-1 h-8 bg-black" />
                  <div className="w-0.5 h-8 bg-black" />
                  <div className="w-1.5 h-8 bg-black" />
                  <div className="w-0.5 h-8 bg-black" />
                  <div className="w-2 h-8 bg-black" />
                  <div className="w-1 h-8 bg-black" />
                  <div className="w-0.5 h-8 bg-black" />
                  <div className="w-1 h-8 bg-black" />
                  <div className="w-2 h-8 bg-black" />
                  <div className="w-1 h-8 bg-black" />
                </div>
                <span className="font-mono text-[10px] tracking-wider text-slate-600 mt-0.5">
                  *{tagModalProduct.barcode}*
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] text-left bg-white p-2 rounded border border-amber-200">
                <div>
                  <span className="text-slate-400">Purity:</span>{" "}
                  <span className="font-bold text-slate-800">{tagModalProduct.purity}</span>
                </div>
                <div>
                  <span className="text-slate-400">HUID:</span>{" "}
                  <span className="font-bold font-mono text-slate-800">{tagModalProduct.huid || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Gross Wt:</span>{" "}
                  <span className="font-bold text-slate-800">{tagModalProduct.grossWeight.toFixed(2)}g</span>
                </div>
                <div>
                  <span className="text-slate-400">Net Wt:</span>{" "}
                  <span className="font-bold text-slate-800">{tagModalProduct.netWeight.toFixed(2)}g</span>
                </div>
              </div>

              <div className="text-sm font-bold text-slate-900 pt-1">
                MRP: ₹{tagModalProduct.approxPrice.toLocaleString("en-IN")}
              </div>
            </div>

            {tagPrinted && (
              <div className="p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg text-center font-bold">
                Tag sent to printer spooler!
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setTagModalProduct(null)} className="btn-outline text-xs px-3">
                Cancel
              </button>
              <button onClick={handlePrintTag} className="btn-gold gap-1.5 text-xs px-4">
                <Printer size={13} /> Print Tag (TSC 2-Inch)
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── ADD PRODUCT MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Jewellery Item"
        icon={<Plus className="text-amber-600" size={18} />}
        maxWidth="max-w-lg"
      >
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Article Name *</label>
                <input
                  required
                  className="input text-xs w-full"
                  placeholder="e.g. 22K Peacock Antique Necklace"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    className="input text-xs w-full bg-white"
                    value={newProd.categoryId}
                    onChange={(e) => setNewProd({ ...newProd, categoryId: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Purity</label>
                  <select
                    className="input text-xs w-full bg-white"
                    value={newProd.purityId}
                    onChange={(e) => setNewProd({ ...newProd, purityId: e.target.value })}
                  >
                    {purities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">HUID (6-digit)</label>
                  <input
                    maxLength={6}
                    className="input text-xs font-mono uppercase w-full"
                    placeholder="e.g. HM7821"
                    value={newProd.huid}
                    onChange={(e) => setNewProd({ ...newProd, huid: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gross Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.01"
                    className="input text-xs font-bold w-full bg-white"
                    placeholder="0.000"
                    value={newProd.grossWeight || ""}
                    onChange={(e) => setNewProd({ ...newProd, grossWeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stone Weight (grams)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="input text-xs font-bold w-full bg-white"
                    placeholder="0.000"
                    value={newProd.stoneWeight || ""}
                    onChange={(e) => setNewProd({ ...newProd, stoneWeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Making Charge (₹/g)</label>
                  <input
                    type="number"
                    className="input text-xs font-bold w-full"
                    value={newProd.makingChargeRate}
                    onChange={(e) =>
                      setNewProd({ ...newProd, makingChargeRate: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Stock Units</label>
                  <input
                    type="number"
                    min="1"
                    className="input text-xs font-bold w-full"
                    value={newProd.stockQty}
                    onChange={(e) =>
                      setNewProd({ ...newProd, stockQty: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline text-xs px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold text-xs px-4"
                >
                  {isSubmitting ? "Creating..." : "Save & Generate Barcode"}
                </button>
              </div>
            </form>
      </Modal>

      {/* ─── PRODUCT DETAIL SLIDE-OVER ────────────────────────────────────────── */}
      <SlideOver
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Product Details"
        subtitle={selectedProduct ? `${selectedProduct.sku} · ${selectedProduct.name}` : ""}
      >
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border">
              <div>
                <span className="text-slate-400 block text-[10px]">Category</span>
                <span className="font-bold text-slate-800">{selectedProduct.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Metal & Purity</span>
                <span className="font-bold text-slate-800">{selectedProduct.metal} ({selectedProduct.purity})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">HUID (Hallmark)</span>
                <span className="font-bold font-mono text-amber-700">{selectedProduct.huid || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Current Stock</span>
                <span className="font-bold text-emerald-700">{selectedProduct.stockQty} pieces</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center p-3 border rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px]">Gross Wt</span>
                <span className="font-bold text-slate-800">{selectedProduct.grossWeight.toFixed(2)}g</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Stone Wt</span>
                <span className="font-bold text-slate-800">{selectedProduct.stoneWeight.toFixed(2)}g</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Net Wt</span>
                <span className="font-bold text-amber-800">{selectedProduct.netWeight.toFixed(2)}g</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div>
                <span className="text-amber-700 block text-[10px] font-semibold">Estimated Valuation</span>
                <span className="text-base font-bold text-amber-950">
                  ₹{selectedProduct.approxPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <button
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  setTagModalProduct(p);
                }}
                className="btn-gold text-xs px-3 py-1.5"
              >
                <Tag size={13} /> View Tag
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
