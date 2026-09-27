"use server";

import { getActiveTenantContext } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function recordPhysicalStockAuditAction(counts: Record<string, number>) {
  try {
    const { session, tenantId } = await getActiveTenantContext();

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.userId,
        action: "PHYSICAL_STOCK_AUDIT",
        entity: "GoldReconciliation",
        newValues: counts,
      },
    });

    revalidatePath("/reports");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record audit." };
  }
}
