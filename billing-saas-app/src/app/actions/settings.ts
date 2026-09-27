"use server";

import { getActiveTenantContext } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface UpdateStoreSettingsInput {
  name?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  panNumber?: string;
  tradeLegalName?: string;
  bisLicenseNumber?: string;
  ahcCenterName?: string;
  invoicePrefix?: string;
  estimatePrefix?: string;
  goldGstPercent?: number;
  makingGstPercent?: number;
  cashPanLimit?: number;
  enforceHuid?: boolean;
  allowNegativeStock?: boolean;
}

export async function updateStoreSettingsAction(input: UpdateStoreSettingsInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();

    await prisma.$transaction(async (tx) => {
      // 1. Update Tenant
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.phone && { phone: input.phone }),
          ...(input.address && { address: input.address }),
          ...(input.gstin && { gstin: input.gstin }),
          ...(input.panNumber && { panNumber: input.panNumber }),
        },
      });

      // 2. Upsert StoreSetting
      await tx.storeSetting.upsert({
        where: { tenantId },
        update: {
          tradeLegalName: input.tradeLegalName,
          bisLicenseNumber: input.bisLicenseNumber,
          ahcCenterName: input.ahcCenterName,
          invoicePrefix: input.invoicePrefix || "INV-2026-",
          estimatePrefix: input.estimatePrefix || "EST-2026-",
          goldGstPercent: input.goldGstPercent ?? 3.0,
          makingGstPercent: input.makingGstPercent ?? 5.0,
          cashPanLimit: input.cashPanLimit ?? 200000,
          enforceHuid: input.enforceHuid ?? true,
          allowNegativeStock: input.allowNegativeStock ?? false,
        },
        create: {
          tenantId,
          tradeLegalName: input.tradeLegalName,
          bisLicenseNumber: input.bisLicenseNumber,
          ahcCenterName: input.ahcCenterName,
          invoicePrefix: input.invoicePrefix || "INV-2026-",
          estimatePrefix: input.estimatePrefix || "EST-2026-",
          goldGstPercent: input.goldGstPercent ?? 3.0,
          makingGstPercent: input.makingGstPercent ?? 5.0,
          cashPanLimit: input.cashPanLimit ?? 200000,
          enforceHuid: input.enforceHuid ?? true,
          allowNegativeStock: input.allowNegativeStock ?? false,
        },
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          action: "UPDATE_SETTINGS",
          entity: "StoreSetting",
          newValues: JSON.parse(JSON.stringify(input)),
        },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/billing");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update store settings." };
  }
}
