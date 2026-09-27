import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings & Compliance",
  description: "Store profile, GST rules, 6-digit HUID enforcement, karat fineness and RBAC settings.",
};

export default async function SettingsPage() {
  const { tenantId } = await getActiveTenantContext();

  const [tenant, storeSetting, purities, users, branches] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
    }),
    prisma.storeSetting.findUnique({
      where: { tenantId },
    }),
    prisma.purity.findMany({
      where: { tenantId },
      orderBy: { fineness: "desc" },
    }),
    prisma.user.findMany({
      where: { tenantId },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const settingData = {
    tradeLegalName: storeSetting?.tradeLegalName ?? tenant.name,
    bisLicenseNumber: storeSetting?.bisLicenseNumber ?? "HM/TN/2024/9876",
    ahcCenterName: storeSetting?.ahcCenterName ?? "Chennai Assaying & Hallmarking Centre (AHC-042)",
    invoicePrefix: storeSetting?.invoicePrefix ?? "INV-2026-",
    estimatePrefix: storeSetting?.estimatePrefix ?? "EST-2026-",
    goldGstPercent: Number(storeSetting?.goldGstPercent ?? 3.0),
    makingGstPercent: Number(storeSetting?.makingGstPercent ?? 5.0),
    cashPanLimit: Number(storeSetting?.cashPanLimit ?? 200000),
    enforceHuid: storeSetting?.enforceHuid ?? true,
    allowNegativeStock: storeSetting?.allowNegativeStock ?? false,
  };

  const usersList = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branch: u.branch?.name || (branches[0]?.name ?? "Main Showroom"),
    status: u.isActive ? "ACTIVE" : "INACTIVE",
  }));

  const puritiesList = purities.map((p) => ({
    id: p.id,
    name: p.name,
    fineness: Number(p.fineness),
  }));

  return (
    <SettingsClient
      tenant={{
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        gstin: tenant.gstin,
        panNumber: tenant.panNumber,
      }}
      storeSetting={settingData}
      purities={puritiesList}
      users={usersList}
    />
  );
}
