"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import {
  recordPurchaseInward,
  recordSupplierPayment,
  RecordPurchaseInwardInput,
} from "@/server/purchases/service";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface PurchaseLineItemActionInput {
  productId: string;
  quantity: number;
  grossWeight: number;
  stoneWeight?: number;
  netWeight: number;
  ratePerGram: number;
  totalCost: number;
}

export interface RecordPurchaseInwardActionInput {
  supplierId: string;
  purchaseNumber?: string;
  purchaseDate?: Date;
  items: PurchaseLineItemActionInput[];
  taxAmount?: number;
  amountPaid?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  branchId?: string;
}

export async function recordPurchaseInwardAction(input: RecordPurchaseInwardActionInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();
    if (!tenantId) {
      return { success: false, error: "No active tenant context found." };
    }

    if (session.role === "CASHIER") {
      return {
        success: false,
        error: "FORBIDDEN: Cashier is not authorized to inward purchases. Manager approval required.",
      };
    }

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const branchId = input.branchId || branch?.id || "branch-main";

    const result = await recordPurchaseInward({
      tenantId,
      branchId,
      supplierId: input.supplierId,
      purchaseNumber: input.purchaseNumber,
      purchaseDate: input.purchaseDate,
      items: input.items,
      taxAmount: input.taxAmount ?? 0,
      amountPaid: input.amountPaid ?? 0,
      paymentMethod: input.paymentMethod ?? PaymentMethod.BANK_TRANSFER,
      notes: input.notes,
      userId: session.userId,
    });

    revalidatePath("/purchases");
    revalidatePath("/suppliers");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      purchaseId: result.purchase.id,
      purchaseNumber: result.purchase.purchaseNumber,
      netAmount: Number(result.purchase.netAmount),
      amountDue: Number(result.purchase.amountDue),
    };
  } catch (error: any) {
    console.error("recordPurchaseInwardAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to record purchase inwarding.",
    };
  }
}

export interface CreateSupplierActionInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  panNumber?: string;
  notes?: string;
}

export async function createSupplierAction(input: CreateSupplierActionInput) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        gstin: input.gstin,
        panNumber: input.panNumber,
        notes: input.notes,
      },
    });

    revalidatePath("/suppliers");
    revalidatePath("/purchases");

    return {
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email ?? "",
        address: supplier.address ?? "",
        gstin: supplier.gstin ?? "",
        panNumber: supplier.panNumber ?? "",
      },
    };
  } catch (error: any) {
    console.error("createSupplierAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create supplier.",
    };
  }
}

export interface RecordSupplierPaymentActionInput {
  purchaseId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  branchId?: string;
}

export async function recordSupplierPaymentAction(input: RecordSupplierPaymentActionInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const result = await recordSupplierPayment({
      tenantId,
      branchId: input.branchId || branch?.id || "branch-main",
      purchaseId: input.purchaseId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentReference: input.reference,
      notes: input.notes,
      userId: session.userId,
    });

    revalidatePath("/purchases");
    revalidatePath("/suppliers");

    return {
      success: true,
      paymentId: result.payment.id,
      amountDueRemaining: Number(result.purchase.amountDue),
    };
  } catch (error: any) {
    console.error("recordSupplierPaymentAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to record supplier payment.",
    };
  }
}
