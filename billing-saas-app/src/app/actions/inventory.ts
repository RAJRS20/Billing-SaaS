"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { recordStockAdjustment, deriveLedgerStockFromMovements } from "@/server/inventory/ledger";
import { revalidatePath } from "next/cache";

export interface StockAdjustmentActionInput {
  productId: string;
  quantityChange: number;
  grossWeightChange?: number;
  stoneWeightChange?: number;
  reason: string;
  notes: string;
  branchId?: string;
}

export async function recordStockAdjustmentAction(input: StockAdjustmentActionInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();
    if (!tenantId) {
      return { success: false, error: "No active tenant context found." };
    }

    // Role check: Only MANAGER, SHOP_OWNER, or SUPER_ADMIN can adjust stock
    if (session.role === "CASHIER") {
      return {
        success: false,
        error: "FORBIDDEN: Cashier role is not authorized to make stock adjustments. Manager approval required.",
      };
    }

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const branchId = input.branchId || branch?.id || "branch-main";

    const result = await recordStockAdjustment({
      tenantId,
      branchId,
      productId: input.productId,
      quantityChange: input.quantityChange,
      grossWeightChange: input.grossWeightChange ?? 0,
      stoneWeightChange: input.stoneWeightChange ?? 0,
      reason: input.reason,
      notes: input.notes,
      userId: session.userId,
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      adjustmentId: result.adjustment.id,
      quantityAfter: result.adjustment.quantityAfter,
      txnId: result.txn.id,
    };
  } catch (error: any) {
    console.error("recordStockAdjustmentAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to record stock adjustment.",
    };
  }
}

export async function verifyStockLedgerIntegrityAction(productId: string, branchId?: string) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const targetBranchId = branchId || branch?.id || "branch-main";

    const ledgerStock = await deriveLedgerStockFromMovements(tenantId, targetBranchId, productId);

    return {
      success: true,
      currentQty: ledgerStock.snapshotQuantity,
      ledgerQty: ledgerStock.derivedQuantity,
      ledgerNetWeight: ledgerStock.derivedNetWeight,
      isReconciled: ledgerStock.isReconciled,
    };
  } catch (error: any) {
    console.error("verifyStockLedgerIntegrityAction error:", error);
    return { success: false, error: error?.message || "Failed to verify ledger integrity." };
  }
}
