"use server";

import { getActiveTenantContext } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface UpdateRateInput {
  purityId: string;
  metalId: string;
  ratePerGram: number;
}

export async function updateGoldRatesAction(rates: UpdateRateInput[]) {
  try {
    const { session, tenantId } = await getActiveTenantContext();

    if (rates.length === 0) {
      throw new Error("No rates provided for update.");
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const r of rates) {
        if (r.ratePerGram <= 0) {
          throw new Error("Rate per gram must be greater than zero.");
        }

        await tx.goldRate.create({
          data: {
            tenantId,
            metalId: r.metalId,
            purityId: r.purityId,
            ratePerGram: r.ratePerGram,
            effectiveAt: now,
            updatedById: session.userId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          action: "UPDATE_GOLD_RATES",
          entity: "GoldRate",
          newValues: JSON.parse(JSON.stringify(rates)),
        },
      });
    });

    revalidatePath("/gold-rates");
    revalidatePath("/billing");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update gold rates." };
  }
}
