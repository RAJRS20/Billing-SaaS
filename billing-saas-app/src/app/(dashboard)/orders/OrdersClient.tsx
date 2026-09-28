"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, ChevronDown, X, Check, Eye,
  Wallet, IndianRupee, Clock, CheckCircle2, Package,
  AlertCircle, ArrowUpRight, ArrowDownRight, FileText,
  XCircle, Hammer, RefreshCw, Truck as TruckIcon,
} from "lucide-react";
import {
  createOrderAction,
  recordAdvanceReceiptAction,
  updateOrderStatusAction,
} from "@/app/actions/orders";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import Modal from "@/components/Modal";
import SlideOver from "@/components/SlideOver";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatusType = "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED";
export type TabId = "orders" | "advances";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDate: string;
  customerId: string;
  customer: string;
  phone: string;
  description: string;
  estimatedAmount: number;
  advancePaid: number;
  balanceDue: number;
  status: OrderStatusType;
  notes: string;
}

export interface AdvanceRecord {
  id: string;
  date: string;
  customerId: string;
  customer: string;
  phone: string;
  orderNumber: string;
  orderId?: string;
  amount: number;
  method: string;
  reference: string;
  isAdjusted: boolean;
  notes: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const ORDER_STATUS: Record<
  OrderStatusType,
  { label: string; bg: string; color: string; border: string; icon: React.ReactNode }
> = {
  PENDING:     { label: "Pending",     bg: "#fffbeb", color: "#92400e", border: "#fde68a", icon: <Clock size={11} /> },
  IN_PROGRESS: { label: "In Progress", bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe", icon: <Hammer size={11} /> },
  READY:       { label: "Ready",       bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", icon: <CheckCircle2 size={11} /> },
  DELIVERED:   { label: "Delivered",    bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", icon: <TruckIcon size={11} /> },
  CANCELLED:   { label: "Cancelled",    bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", icon: <XCircle size={11} /> },
};

export default function OrdersClient({
  initialOrders = [],
  initialAdvances = [],
  customers = [],
}: {
  initialOrders?: OrderRecord[];
  initialAdvances?: AdvanceRecord[];
  customers?: CustomerOption[];
}) {
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [advances, setAdvances] = useState<AdvanceRecord[]>(initialAdvances);
  const [activeTab, setActiveTab] = useState<TabId>("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusType | "ALL">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        searchQuery === "" ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const totalValue = orders.reduce((s, o) => s + o.estimatedAmount, 0);
  const totalAdvancesSum = advances.reduce((s, a) => s + a.amount, 0);
  const totalDue = orders.reduce((s, o) => s + o.balanceDue, 0);
  const activeCount = orders.filter((o) => o.status === "IN_PROGRESS" || o.status === "PENDING").length;

  const handleOrderCreated = (newOrder: OrderRecord, newAdv?: AdvanceRecord) => {
    setOrders((prev) => [newOrder, ...prev]);
    if (newAdv) {
      setAdvances((prev) => [newAdv, ...prev]);
    }
  };

  const handleAdvanceRecorded = (newAdv: AdvanceRecord) => {
    setAdvances((prev) => [newAdv, ...prev]);
    setOrders((prev) =>
      prev.map((o) => {
        if (o.orderNumber !== newAdv.orderNumber) return o;
        const newPaid = o.advancePaid + newAdv.amount;
        const newDue = Math.max(0, o.estimatedAmount - newPaid);
        return { ...o, advancePaid: newPaid, balanceDue: newDue };
      })
    );
    if (selectedOrder && selectedOrder.orderNumber === newAdv.orderNumber) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              advancePaid: prev.advancePaid + newAdv.amount,
              balanceDue: Math.max(0, prev.estimatedAmount - (prev.advancePaid + newAdv.amount)),
            }
          : null
      );
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const res = await updateOrderStatusAction(orderId, newStatus);
    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as OrderStatusType } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus as OrderStatusType } : null));
      }
    } else {
      alert(res.error || "Failed to update order status.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Custom Orders & Advances
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            {orders.length} custom bespoke jewellery orders · Advance deposits & workshop tracking
          </p>
        </div>
        <button
          className="btn-gold text-xs"
          id="new-order-btn"
          onClick={() => setShowNewOrderModal(true)}
        >
          <Plus size={14} /> New Custom Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Order Pipeline",
            value: fmt(totalValue),
            sub: `${orders.length} total bespoke orders`,
            icon: <Package size={18} />,
            color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe",
          },
          {
            label: "Advances Collected",
            value: fmt(totalAdvancesSum),
            sub: `${advances.length} advance receipts`,
            icon: <Wallet size={18} />,
            color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
          },
          {
            label: "Pending Delivery Due",
            value: fmt(totalDue),
            sub: `${orders.filter((o) => o.balanceDue > 0).length} orders with dues`,
            icon: <AlertCircle size={18} />,
            color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
          },
          {
            label: "In Production",
            value: activeCount.toString(),
            sub: "In workshop / karigar",
            icon: <Hammer size={18} />,
            color: "#b45309", bg: "#fffbeb", border: "#fde68a",
          },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`stat-card animate-fade-up stagger-${i + 1}`} style={{ padding: "1rem 1.25rem" }}>
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center border"
                style={{ background: kpi.bg, color: kpi.color, borderColor: kpi.border }}
              >
                {kpi.icon}
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                {kpi.value}
              </p>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{kpi.label}</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === "orders" ? "bg-amber-100 text-amber-900" : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("orders")}
        >
          Custom Orders ({orders.length})
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === "advances" ? "bg-amber-100 text-amber-900" : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("advances")}
        >
          Advance Receipts ({advances.length})
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-4 animate-fade-up">
          {/* Search + Filter */}
          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <div className="search-wrapper flex-1 min-w-[220px]">
              <Search size={16} className="search-icon-left" />
              <input
                className="input search-input pr-9"
                placeholder="Search by order number, customer or description…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="orders-search"
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
            <div className="relative">
              <select
                className="input pr-8 appearance-none cursor-pointer"
                style={{ minWidth: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatusType | "ALL")}
                id="orders-filter-status"
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(ORDER_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>

          {/* Orders Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Order Date</th>
                    <th>Due Date</th>
                    <th>Estimated Amount</th>
                    <th>Advance Paid</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const sc = ORDER_STATUS[o.status] || ORDER_STATUS.PENDING;
                    return (
                      <tr
                        key={o.id}
                        className="cursor-pointer transition-colors"
                        onClick={() => setSelectedOrder(o)}
                      >
                        <td><span className="text-xs font-bold text-amber-800">{o.orderNumber}</span></td>
                        <td>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{o.customer}</p>
                            <p className="text-[10px] text-slate-400">{o.phone}</p>
                          </div>
                        </td>
                        <td><p className="text-xs font-medium text-slate-700 max-w-[200px] truncate">{o.description}</p></td>
                        <td><span className="text-xs text-slate-600">{o.orderDate}</span></td>
                        <td><span className="text-xs text-slate-600 font-medium">{o.expectedDate || "—"}</span></td>
                        <td><span className="text-sm font-bold text-gold">{fmt(o.estimatedAmount)}</span></td>
                        <td><span className="text-xs font-semibold text-emerald-700">{fmt(o.advancePaid)}</span></td>
                        <td>
                          {o.balanceDue > 0 ? (
                            <span className="badge badge-danger text-xs font-bold">{fmt(o.balanceDue)}</span>
                          ) : (
                            <span className="badge badge-success text-[10px]">Settled</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge text-[10px] flex items-center gap-1 w-fit"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                          >
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Advances Tab */}
      {activeTab === "advances" && (
        <div className="space-y-4 animate-fade-up">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Order #</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((a) => (
                    <tr key={a.id}>
                      <td><span className="text-xs font-semibold text-slate-800">{a.date}</span></td>
                      <td>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{a.customer}</p>
                          <p className="text-[10px] text-slate-400">{a.phone}</p>
                        </div>
                      </td>
                      <td><span className="text-xs font-bold text-amber-800">{a.orderNumber}</span></td>
                      <td><span className="text-sm font-bold text-gold">{fmt(a.amount)}</span></td>
                      <td><span className="badge badge-info text-[10px]">{a.method}</span></td>
                      <td><span className="text-[11px] text-slate-500 font-mono">{a.reference || "—"}</span></td>
                      <td>
                        {a.isAdjusted ? (
                          <span className="badge badge-success text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 size={10} /> Adjusted
                          </span>
                        ) : (
                          <span className="badge badge-gold text-[10px] flex items-center gap-1 w-fit">
                            <Clock size={10} /> Active
                          </span>
                        )}
                      </td>
                      <td><p className="text-[11px] text-slate-500 max-w-[160px] truncate">{a.notes}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Panel */}
      <SlideOver
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        subtitle={selectedOrder?.orderNumber}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Customer", value: selectedOrder.customer },
                { label: "Phone", value: selectedOrder.phone },
                { label: "Order Date", value: selectedOrder.orderDate },
                { label: "Expected Delivery", value: selectedOrder.expectedDate || "—" },
                { label: "Estimated Amount", value: fmt(selectedOrder.estimatedAmount) },
                { label: "Advance Paid", value: fmt(selectedOrder.advancePaid) },
                { label: "Balance Due", value: fmt(selectedOrder.balanceDue) },
              ].map((d) => (
                <div key={d.label} className="rounded-xl p-3 border bg-slate-50 border-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d.label}</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>

            {/* Status Updater */}
            <div className="rounded-xl p-4 border bg-amber-50/50 border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Order Status</p>
                <p className="text-sm font-bold text-amber-950 mt-0.5">{selectedOrder.status}</p>
              </div>
              <div className="flex gap-2">
                {selectedOrder.status === "PENDING" && (
                  <button
                    className="btn-gold text-xs py-1 px-2.5"
                    onClick={() => handleStatusChange(selectedOrder.id, OrderStatus.IN_PROGRESS)}
                  >
                    Start Workshop
                  </button>
                )}
                {selectedOrder.status === "IN_PROGRESS" && (
                  <button
                    className="btn-gold text-xs py-1 px-2.5 bg-emerald-600"
                    onClick={() => handleStatusChange(selectedOrder.id, OrderStatus.READY)}
                  >
                    Mark Ready
                  </button>
                )}
                {selectedOrder.status === "READY" && (
                  <button
                    className="btn-gold text-xs py-1 px-2.5"
                    onClick={() => handleStatusChange(selectedOrder.id, OrderStatus.DELIVERED)}
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl p-3 border bg-slate-50 border-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Description</p>
              <p className="text-xs font-medium text-slate-600 mt-0.5">{selectedOrder.description}</p>
            </div>

            {/* Advance Receipts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="section-title flex items-center gap-2">
                  <Wallet size={16} style={{ color: "var(--gold-500)" }} />
                  Advance Receipts
                </h4>
                {selectedOrder.balanceDue > 0 && (
                  <button
                    className="btn-gold text-xs py-1 px-3"
                    onClick={() => setShowAdvanceModal(true)}
                  >
                    + Add Advance
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {advances
                  .filter((a) => a.orderNumber === selectedOrder.orderNumber)
                  .map((a) => (
                    <div key={a.id} className="p-3 rounded-xl border flex items-center justify-between border-slate-200">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{a.date}</p>
                        <p className="text-[10px] text-slate-400">{a.method} {a.reference ? `· ${a.reference}` : ""}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">{fmt(a.amount)}</span>
                    </div>
                  ))}
                {advances.filter((a) => a.orderNumber === selectedOrder.orderNumber).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No advances received yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* New Custom Order Modal */}
      {showNewOrderModal && (
        <NewCustomOrderModal
          customers={customers}
          onClose={() => setShowNewOrderModal(false)}
          onSuccess={handleOrderCreated}
        />
      )}

      {/* Record Advance Modal */}
      {showAdvanceModal && selectedOrder && (
        <RecordAdvanceModal
          order={selectedOrder}
          onClose={() => setShowAdvanceModal(false)}
          onSuccess={handleAdvanceRecorded}
        />
      )}
    </div>
  );
}

// ─── New Custom Order Modal ───────────────────────────────────────────────────

function NewCustomOrderModal({
  customers,
  onClose,
  onSuccess,
}: {
  customers: CustomerOption[];
  onClose: () => void;
  onSuccess: (order: OrderRecord, advance?: AdvanceRecord) => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [description, setDescription] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [initialAdvance, setInitialAdvance] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !description || !estimatedAmount) {
      setErrorMsg("Please select a customer, enter description and estimated amount.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const estNum = parseFloat(estimatedAmount) || 0;
      const advNum = parseFloat(initialAdvance) || 0;

      const res = await createOrderAction({
        customerId,
        description,
        estimatedAmount: estNum,
        initialAdvanceAmount: advNum,
        paymentMethod,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create order.");
      } else {
        const cust = customers.find((c) => c.id === customerId);
        const newOrd: OrderRecord = {
          id: res.orderId!,
          orderNumber: res.orderNumber!,
          orderDate: "Today",
          expectedDate: expectedDate || "—",
          customerId,
          customer: cust?.name || "Customer",
          phone: cust?.phone || "",
          description,
          estimatedAmount: estNum,
          advancePaid: advNum,
          balanceDue: res.balanceDue ?? Math.max(0, estNum - advNum),
          status: "PENDING",
          notes,
        };

        let newAdv: AdvanceRecord | undefined;
        if (advNum > 0) {
          newAdv = {
            id: `adv-${Date.now()}`,
            date: "Today",
            customerId,
            customer: cust?.name || "Customer",
            phone: cust?.phone || "",
            orderNumber: res.orderNumber!,
            amount: advNum,
            method: paymentMethod,
            reference: "Initial Advance",
            isAdjusted: false,
            notes: `Initial advance for ${res.orderNumber}`,
          };
        }

        onSuccess(newOrd, newAdv);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create Bespoke Custom Order"
      icon={<Package size={18} className="text-amber-700" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Select Customer *</label>
          <select
            className="input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Jewellery Description *</label>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. 22K Gold Antique Choker with matching jhumkas — 45g target weight"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Estimated Order Value (₹) *</label>
            <input
              className="input font-bold text-amber-800"
              type="number"
              placeholder="350000"
              value={estimatedAmount}
              onChange={(e) => setEstimatedAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="input-label">Target Delivery Date</label>
            <input
              className="input"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Initial Advance Deposit (₹)</label>
            <input
              className="input font-bold text-emerald-800"
              type="number"
              placeholder="50000"
              value={initialAdvance}
              onChange={(e) => setInitialAdvance(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Deposit Payment Mode</label>
            <select
              className="input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="input-label">Workshop / Karigar Notes</label>
          <input
            className="input"
            placeholder="Design reference photo attached, stone color preferences…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border flex items-start gap-2 bg-red-50 border-red-200">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
            <p className="text-xs font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-outline flex-1 justify-center" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-gold flex-1 justify-center" disabled={submitting}>
            {submitting ? "Booking…" : "Book Custom Order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Record Advance Modal Component ───────────────────────────────────────────

function RecordAdvanceModal({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRecord;
  onClose: () => void;
  onSuccess: (advance: AdvanceRecord) => void;
}) {
  const [amount, setAmount] = useState(order.balanceDue.toString());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Please enter a valid deposit amount.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await recordAdvanceReceiptAction({
        orderId: order.id,
        customerId: order.customerId,
        amount: amt,
        paymentMethod: method,
        reference,
        notes,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to record advance.");
      } else {
        const newAdv: AdvanceRecord = {
          id: res.advanceId!,
          date: "Today",
          customerId: order.customerId,
          customer: order.customer,
          phone: order.phone,
          orderNumber: order.orderNumber,
          amount: amt,
          method,
          reference,
          isAdjusted: false,
          notes: notes || `Advance deposit for ${order.orderNumber}`,
        };
        onSuccess(newAdv);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to record advance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Record Advance Deposit"
      icon={<Wallet size={18} className="text-emerald-700" />}
      maxWidth="max-w-sm"
      headerBg="bg-emerald-50/70"
      headerBorder="border-emerald-200"
    >
      <form onSubmit={handleDeposit} className="space-y-4">
        <div>
          <p className="text-xs text-slate-500 font-medium">Customer:</p>
          <p className="text-sm font-bold text-slate-800">{order.customer}</p>
          <p className="text-[11px] text-amber-700 font-bold mt-0.5">Order: {order.orderNumber}</p>
        </div>

        <div>
          <label className="input-label">Advance Deposit Amount (₹) *</label>
          <input
            className="input font-bold text-emerald-800"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <p className="text-[10px] text-slate-400 mt-1">Order Balance Due: {fmt(order.balanceDue)}</p>
        </div>

        <div>
          <label className="input-label">Payment Mode</label>
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
          </select>
        </div>

        <div>
          <label className="input-label">Reference / UTR / Cheque #</label>
          <input
            className="input"
            placeholder="e.g. UPI-REF-90218"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border flex items-start gap-2 bg-red-50 border-red-200">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
            <p className="text-xs font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-outline flex-1 justify-center" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-gold flex-1 justify-center" disabled={submitting}>
            {submitting ? "Depositing…" : "Issue Advance Receipt"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
