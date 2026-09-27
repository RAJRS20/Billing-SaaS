"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import {
  processSaleReturn,
  ProcessSaleReturnInput,
  ReturnItemInput,
} from "@/server/returns/service";
import { revalidatePath } from "next/cache";

export interface ProcessSaleReturnActionInput {
  saleId: string;
  items: ReturnItemInput[];
  refundAmount: number;
  refundMethod: "CASH" | "UPI" | "CREDIT_NOTE";
  reason: string;
  branchId?: string;
}

export async function processSaleReturnAction(input: ProcessSaleReturnActionInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const branchId = input.branchId || branch?.id || "branch-main";

    const result = await processSaleReturn({
      tenantId,
      branchId,
      saleId: input.saleId,
      items: input.items,
      refundAmount: input.refundAmount,
      refundMethod: input.refundMethod,
      reason: input.reason,
      userId: session.userId,
    });

    revalidatePath("/returns");
    revalidatePath("/invoices");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      returnId: result.id,
      refundAmount: Number(result.refundAmount),
      creditNoteNumber: `CN-${result.id.slice(-6).toUpperCase()}`,
    };
  } catch (error: any) {
    console.error("processSaleReturnAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to process sale return.",
    };
  }
}

export async function lookupSaleForReturnAction(invoiceNumberOrId: string) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return null;

    const sale = await prisma.sale.findFirst({
      where: {
        tenantId,
        OR: [
          { invoiceNumber: { equals: invoiceNumberOrId.trim(), mode: "insensitive" } },
          { id: invoiceNumberOrId.trim() },
        ],
      },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            product: {
              include: { purity: true },
            },
          },
        },
      },
    });

    if (!sale) return null;

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.createdAt.toISOString(),
      customerName: sale.customer?.name || "Walk-in Customer",
      customerPhone: sale.customer?.phone || "—",
      branchName: sale.branch.name,
      totalNetAmount: Number(sale.netAmount),
      items: sale.items.map((i) => ({
        saleItemId: i.id,
        productId: i.productId,
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        ratePerGram: Number(i.goldRatePerGram),
        totalCost: Number(i.itemNetAmount),
        purity: i.product.purity?.name ?? "22K",
        grossWeight: Number(i.grossWeight),
      })),
    };
  } catch (error) {
    console.error("lookupSaleForReturnAction error:", error);
    return null;
  }
}
