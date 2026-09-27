"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import {
  recordOldGoldTransaction,
  RecordOldGoldInput,
} from "@/server/old-gold/service";
import { OldGoldType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface RecordOldGoldActionInput {
  customerId?: string;
  type: OldGoldType;
  purityName: string;
  testedFineness: number;
  grossWeight: number;
  stoneWeight?: number;
  meltingDeductionPercent?: number;
  buyingRate24K: number;
  saleId?: string;
  notes?: string;
  branchId?: string;
}

export async function recordOldGoldAction(input: RecordOldGoldActionInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();
    if (!tenantId) {
      return { success: false, error: "No active tenant context found." };
    }

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const branchId = input.branchId || branch?.id || "branch-main";

    const result = await recordOldGoldTransaction({
      tenantId,
      branchId,
      customerId: input.customerId,
      userId: session.userId,
      type: input.type,
      purityName: input.purityName,
      testedFineness: input.testedFineness,
      grossWeight: input.grossWeight,
      stoneWeight: input.stoneWeight ?? 0,
      meltingDeductionPercent: input.meltingDeductionPercent ?? 2.0,
      buyingRate24K: input.buyingRate24K,
      saleId: input.saleId,
      notes: input.notes,
    });

    revalidatePath("/old-gold");
    revalidatePath("/billing");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      transactionId: result.oldGoldTxn.id,
      valuationAmount: Number(result.oldGoldTxn.valuationAmount),
      pureGoldEquivalent: Number(result.oldGoldTxn.pureGoldEquivalent),
    };
  } catch (error: any) {
    console.error("recordOldGoldAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to record old gold transaction.",
    };
  }
}
