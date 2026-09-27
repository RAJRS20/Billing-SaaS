"use server";

import { getActiveTenantContext } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { EstimateStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface EstimateItemInput {
  productId: string;
  productName: string;
  grossWeight: number;
  netWeight: number;
  goldRatePerGram: number;
  makingCharge: number;
  stoneCharge: number;
  quantity: number;
}

export interface CreateEstimateInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  discountAmount?: number;
  items: EstimateItemInput[];
}

export async function createEstimateAction(input: CreateEstimateInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();

    if (!input.items || input.items.length === 0) {
      throw new Error("Estimate must contain at least one item.");
    }

    // Customer resolution
    let customerId = input.customerId;
    if (!customerId && input.customerPhone) {
      let customer = await prisma.customer.findFirst({
        where: { tenantId, phone: input.customerPhone },
      });
      if (!customer && input.customerName) {
        customer = await prisma.customer.create({
          data: {
            tenantId,
            name: input.customerName,
            phone: input.customerPhone,
          },
        });
      }
      customerId = customer?.id;
    }

    // Sequence
    const count = await prisma.estimate.count({ where: { tenantId } });
    const estimateNumber = `EST-2026-${(count + 1).toString().padStart(4, "0")}`;

    // Calculations
    let grossAmount = 0;
    const itemsData = input.items.map((item) => {
      const goldValue = Math.round(item.netWeight * item.goldRatePerGram * 100) / 100;
      const totalAmount = Math.round((goldValue + item.makingCharge + item.stoneCharge) * item.quantity * 100) / 100;
      grossAmount += totalAmount;

      return {
        productId: item.productId,
        productName: item.productName,
        grossWeight: item.grossWeight,
        netWeight: item.netWeight,
        goldRatePerGram: item.goldRatePerGram,
        goldValue,
        makingCharge: item.makingCharge,
        stoneCharge: item.stoneCharge,
        quantity: item.quantity,
        totalAmount,
      };
    });

    const discountAmount = input.discountAmount || 0;
    const taxableAmount = Math.max(0, grossAmount - discountAmount);
    const taxAmount = Math.round(taxableAmount * 0.03 * 100) / 100;
    const netAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7-day rate lock

    const estimate = await prisma.estimate.create({
      data: {
        tenantId,
        customerId,
        estimateNumber,
        estimateDate: new Date(),
        expiryDate,
        goldRateSnapshot: {
          ratePerGram: input.items[0]?.goldRatePerGram || 6120,
          lockedAt: new Date().toISOString(),
        },
        grossAmount,
        discountAmount,
        taxAmount,
        netAmount,
        status: EstimateStatus.PENDING,
        notes: input.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.userId,
        action: "CREATE_ESTIMATE",
        entity: "Estimate",
        entityId: estimate.id,
        newValues: { estimateNumber, netAmount },
      },
    });

    revalidatePath("/estimates");

    return { success: true, estimate };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create estimate." };
  }
}

export async function updateEstimateStatusAction(estimateId: string, status: EstimateStatus) {
  try {
    const { session, tenantId } = await getActiveTenantContext();

    const updated = await prisma.estimate.update({
      where: { id: estimateId, tenantId },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.userId,
        action: `ESTIMATE_STATUS_${status}`,
        entity: "Estimate",
        entityId: estimateId,
      },
    });

    revalidatePath("/estimates");
    return { success: true, estimate: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update estimate status." };
  }
}
