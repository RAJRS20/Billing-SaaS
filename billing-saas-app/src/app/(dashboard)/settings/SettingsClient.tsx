"use client";

import { useState } from "react";
import {
  Settings, Building2, ShieldCheck, Scale, Users,
  Printer, CreditCard, Save, Check, CheckCircle2, AlertCircle,
  HelpCircle, Sliders, Lock, Sparkles, Plus, Trash2,
  FileText, Smartphone, HardDrive, Bell
} from "lucide-react";
import { updateStoreSettingsAction } from "@/app/actions/settings";

type SettingsTab = "STORE" | "COMPLIANCE" | "PRICING" | "RBAC" | "HARDWARE" | "SUBSCRIPTION";

interface SettingsClientProps {
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    gstin: string | null;
    panNumber: string | null;
  };
  storeSetting: {
    tradeLegalName: string | null;
    bisLicenseNumber: string | null;
    ahcCenterName: string | null;
    invoicePrefix: string;
    estimatePrefix: string;
    goldGstPercent: number;
    makingGstPercent: number;
    cashPanLimit: number;
    enforceHuid: boolean;
    allowNegativeStock: boolean;
  };
  purities: {
    id: string;
    name: string;
    fineness: number;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    branch: string;
    status: string;
  }[];
}

export default function SettingsClient({
  tenant,
  storeSetting,
  purities,
  users,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("STORE");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Store profile state
  const [storeForm, setStoreForm] = useState({
    storeName: tenant.name || "Sri Lakshmi Jewellers",
    tradeLegalName: storeSetting.tradeLegalName || "Sri Lakshmi Jewellery Works Pvt Ltd",
    gstin: tenant.gstin || "33AAAAA0000A1Z5",
    pan: tenant.panNumber || "AAAAA0000A",
    bisLicense: storeSetting.bisLicenseNumber || "HM/TN/2024/9876",
    ahcName: storeSetting.ahcCenterName || "Chennai Assaying & Hallmarking Centre (AHC-042)",
    phone: tenant.phone || "+91 98765 43210",
    email: tenant.email || "contact@srilakshmijewellers.com",
    address: tenant.address || "142, Car Street, Coimbatore, Tamil Nadu - 641001",
    invoicePrefix: storeSetting.invoicePrefix || "INV-2026-",
    estimatePrefix: storeSetting.estimatePrefix || "EST-2026-",
  });

  // Compliance rules state
  const [complianceForm, setComplianceForm] = useState({
    goldGstPct: storeSetting.goldGstPercent,
    makingChargeGstPct: storeSetting.makingGstPercent,
    cashPanThreshold: storeSetting.cashPanLimit,
    enforceHuid: storeSetting.enforceHuid,
    allowNegativeStock: storeSetting.allowNegativeStock,
  });

  // Hardware state
  const [hardwareForm, setHardwareForm] = useState({
    invoiceType: "THERMAL_3INCH",
    printShopLogo: true,
    printHuidQrCode: true,
    scaleConnected: true,
    scaleComPort: "COM3",
    scaleBaudRate: 9600,
    termsFooter: "Gold ornaments sold are subject to standard hallmarking terms. Goods once sold cannot be returned without invoice.",
  });

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg("");

    const res = await updateStoreSettingsAction({
      name: storeForm.storeName,
      phone: storeForm.phone,
      address: storeForm.address,
      gstin: storeForm.gstin,
      panNumber: storeForm.pan,
      tradeLegalName: storeForm.tradeLegalName,
      bisLicenseNumber: storeForm.bisLicense,
      ahcCenterName: storeForm.ahcName,
      invoicePrefix: storeForm.invoicePrefix,
      estimatePrefix: storeForm.estimatePrefix,
      goldGstPercent: complianceForm.goldGstPct,
      makingGstPercent: complianceForm.makingChargeGstPct,
      cashPanLimit: complianceForm.cashPanThreshold,
      enforceHuid: complianceForm.enforceHuid,
      allowNegativeStock: complianceForm.allowNegativeStock,
    });

    setIsSaving(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to save settings.");
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
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
              System Settings & Configuration
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}
            >
              <ShieldCheck size={11} /> Multi-Tenant Secure
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Configure store identity, statutory GST & HUID compliance, karat fineness & RBAC permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {errorMsg && (
            <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded">
              {errorMsg}
            </span>
          )}
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 animate-fade-up">
              <Check size={14} /> Settings Saved Successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-gold gap-1.5 text-xs h-9 px-4"
            id="save-settings-btn"
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ─── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2 -mb-px overflow-x-auto">
          {[
            { id: "STORE", label: "Store & Branch Profile", icon: <Building2 size={15} /> },
            { id: "COMPLIANCE", label: "Tax & Compliance (GST/HUID)", icon: <ShieldCheck size={15} /> },
            { id: "PRICING", label: "Pricing & Karat Fineness", icon: <Scale size={15} /> },
            { id: "RBAC", label: "Users & RBAC Roles", icon: <Users size={15} /> },
            { id: "HARDWARE", label: "Thermal Printers & Scale", icon: <Printer size={15} /> },
            { id: "SUBSCRIPTION", label: "SaaS Plan & Storage", icon: <CreditCard size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-amber-600 text-amber-800 bg-amber-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: STORE & BRANCH PROFILE ───────────────────────────────────── */}
      {activeTab === "STORE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5 rounded-xl border space-y-4 bg-white">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-amber-600" /> Store Identification & Invoicing
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Display Shop Name</label>
                <input
                  type="text"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Trade / Legal Registered Name</label>
                <input
                  type="text"
                  value={storeForm.tradeLegalName}
                  onChange={(e) => setStoreForm({ ...storeForm, tradeLegalName: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={storeForm.gstin}
                    onChange={(e) => setStoreForm({ ...storeForm, gstin: e.target.value })}
                    className="input text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={storeForm.pan}
                    onChange={(e) => setStoreForm({ ...storeForm, pan: e.target.value })}
                    className="input text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={storeForm.invoicePrefix}
                    onChange={(e) => setStoreForm({ ...storeForm, invoicePrefix: e.target.value })}
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estimate Prefix</label>
                  <input
                    type="text"
                    value={storeForm.estimatePrefix}
                    onChange={(e) => setStoreForm({ ...storeForm, estimatePrefix: e.target.value })}
                    className="input text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 rounded-xl border space-y-4 bg-white">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-600" /> BIS Hallmarking & Contact
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">BIS License Number</label>
                <input
                  type="text"
                  value={storeForm.bisLicense}
                  onChange={(e) => setStoreForm({ ...storeForm, bisLicense: e.target.value })}
                  className="input text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assaying & Hallmarking Centre (AHC)</label>
                <input
                  type="text"
                  value={storeForm.ahcName}
                  onChange={(e) => setStoreForm({ ...storeForm, ahcName: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="text"
                    value={storeForm.email}
                    disabled
                    className="input text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Showroom Address</label>
                <textarea
                  rows={3}
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="input text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COMPLIANCE ──────────────────────────────────────────────── */}
      {activeTab === "COMPLIANCE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5 rounded-xl border space-y-4 bg-white">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-600" /> Statutory GST Rates
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Gold & Silver Jewellery GST Rate</p>
                  <p className="text-[11px] text-slate-500">Statutory 3% GST (1.5% CGST + 1.5% SGST)</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={complianceForm.goldGstPct}
                    onChange={(e) =>
                      setComplianceForm({ ...complianceForm, goldGstPct: parseFloat(e.target.value) || 0 })
                    }
                    className="input text-xs font-bold text-right py-1 px-2 w-16 bg-white"
                  />
                  <span className="font-semibold text-slate-600">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Making Charges GST Rate</p>
                  <p className="text-[11px] text-slate-500">Service charge rate under GST schedule</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={complianceForm.makingChargeGstPct}
                    onChange={(e) =>
                      setComplianceForm({ ...complianceForm, makingChargeGstPct: parseFloat(e.target.value) || 0 })
                    }
                    className="input text-xs font-bold text-right py-1 px-2 w-16 bg-white"
                  />
                  <span className="font-semibold text-slate-600">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Section 269ST PAN Mandatory Threshold</p>
                  <p className="text-[11px] text-slate-500">Rule 114B: Cash transaction threshold requiring PAN</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-600">₹</span>
                  <input
                    type="number"
                    value={complianceForm.cashPanThreshold}
                    onChange={(e) =>
                      setComplianceForm({ ...complianceForm, cashPanThreshold: parseInt(e.target.value) || 0 })
                    }
                    className="input text-xs font-bold text-right py-1 px-2 w-28 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 rounded-xl border space-y-4 bg-white">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Lock size={16} className="text-amber-600" /> Operational Safeguards
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Enforce 6-Digit HUID on All Sales</p>
                  <p className="text-[11px] text-slate-500">Blocks billing any hallmarked article lacking valid HUID</p>
                </div>
                <input
                  type="checkbox"
                  checked={complianceForm.enforceHuid}
                  onChange={(e) => setComplianceForm({ ...complianceForm, enforceHuid: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Allow Negative Stock Override</p>
                  <p className="text-[11px] text-slate-500">Strictly prohibited for bullion compliance audit</p>
                </div>
                <input
                  type="checkbox"
                  checked={complianceForm.allowNegativeStock}
                  onChange={(e) => setComplianceForm({ ...complianceForm, allowNegativeStock: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: PRICING & KARAT FINENESS ─────────────────────────────────── */}
      {activeTab === "PRICING" && (
        <div className="card p-5 rounded-xl border space-y-4 bg-white">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Scale size={16} className="text-amber-600" /> Karatage Fineness & Multiplier Table
          </h3>
          <p className="text-xs text-slate-500">
            Gold fineness coefficients registered in the database for automatic pricing derivation:
          </p>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purity Karat</th>
                  <th>BIS Standard Fineness</th>
                  <th>Multiplier vs 24K</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purities.map((p) => (
                  <tr key={p.id}>
                    <td className="font-bold text-xs text-amber-900">{p.name}</td>
                    <td className="font-mono text-xs font-semibold text-slate-800">
                      {(Number(p.fineness) * 1000).toFixed(0)}/1000
                    </td>
                    <td className="font-mono text-xs text-slate-600">{Number(p.fineness).toFixed(3)}</td>
                    <td>
                      <span className="badge badge-success text-[10px]">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: USERS & RBAC ROLES ───────────────────────────────────────── */}
      {activeTab === "RBAC" && (
        <div className="card p-5 rounded-xl border space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-amber-600" /> Active Staff Accounts & RBAC Roles
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Role-based access control with tenant-scoped permissions
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Branch Scoping</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-bold text-xs text-slate-800">{u.name}</td>
                    <td className="text-xs text-slate-500 font-mono">{u.email}</td>
                    <td>
                      <span className="badge badge-gold text-[10px]">{u.role}</span>
                    </td>
                    <td className="text-xs text-slate-600">{u.branch}</td>
                    <td>
                      <span className="badge badge-success text-[10px]">{u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: HARDWARE & PRINTING ──────────────────────────────────────── */}
      {activeTab === "HARDWARE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5 rounded-xl border space-y-4 bg-white">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Printer size={16} className="text-amber-600" /> POS Receipt & Tag Printers
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Invoice Receipt Output</label>
                <select
                  value={hardwareForm.invoiceType}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, invoiceType: e.target.value })}
                  className="input text-xs w-full bg-white"
                >
                  <option value="THERMAL_3INCH">80mm ESC/POS High-Speed Thermal</option>
                  <option value="A4_LASER">A4 Laser Pre-Printed Legal Invoice</option>
                  <option value="A5_COMPACT">A5 Compact Showroom Bill</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <span className="font-semibold text-slate-700">Print Shop Logo on Header</span>
                <input
                  type="checkbox"
                  checked={hardwareForm.printShopLogo}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, printShopLogo: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <span className="font-semibold text-slate-700">Print HUID Verification QR Code</span>
                <input
                  type="checkbox"
                  checked={hardwareForm.printHuidQrCode}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, printHuidQrCode: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>
            </div>
          </div>

          <div className="card p-5 rounded-xl border space-y-4 bg-white">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Scale size={16} className="text-amber-600" /> Precision Weighing Scale Bridge
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">COM Port</label>
                  <input
                    type="text"
                    value={hardwareForm.scaleComPort}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, scaleComPort: e.target.value })}
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Baud Rate</label>
                  <input
                    type="number"
                    value={hardwareForm.scaleBaudRate}
                    onChange={(e) =>
                      setHardwareForm({ ...hardwareForm, scaleBaudRate: parseInt(e.target.value) || 9600 })
                    }
                    className="input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Invoice Footer Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={hardwareForm.termsFooter}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, termsFooter: e.target.value })}
                  className="input text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: SUBSCRIPTION & SAAS PLAN ─────────────────────────────────── */}
      {activeTab === "SUBSCRIPTION" && (
        <div className="card p-5 rounded-xl border space-y-4 bg-white">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <CreditCard size={16} className="text-amber-600" /> JewelBill Enterprise SaaS Subscription
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-200">
              <span className="text-slate-500 font-semibold block">Active Plan</span>
              <span className="text-lg font-bold text-amber-950 mt-1 block">Enterprise Multi-Branch</span>
              <span className="text-emerald-700 font-bold block mt-1">Status: Active & Verified</span>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-slate-500 font-semibold block">Branch Allocation</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">Unlimited Branches</span>
              <span className="text-slate-400 block mt-1">All Showroom Counters Connected</span>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-slate-500 font-semibold block">Cloud Ledger Storage</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">Immutable S3 Archive</span>
              <span className="text-emerald-700 font-bold block mt-1">Daily Automated PostgreSQL Backup</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
