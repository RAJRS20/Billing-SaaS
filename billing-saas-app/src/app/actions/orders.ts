"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import {
  createOrder,
  recordAdvanceReceipt,
  transitionOrderStatus,
} from "@/server/orders/service";
import { PaymentMethod, OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CreateOrderActionInput {
  customerId: string;
  description: string;
  estimatedAmount: number;
  initialAdvanceAmount?: number;
  paymentMethod?: PaymentMethod;
  expectedDate?: Date;
  notes?: string;
}

export async function createOrderAction(input: CreateOrderActionInput) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const order = await createOrder({
      tenantId,
      customerId: input.customerId,
      description: input.description,
      estimatedAmount: input.estimatedAmount,
      initialAdvanceAmount: input.initialAdvanceAmount ?? 0,
      paymentMethod: input.paymentMethod ?? PaymentMethod.UPI,
      expectedDate: input.expectedDate,
      notes: input.notes,
    });

    revalidatePath("/orders");
    revalidatePath("/customers");
    revalidatePath("/dashboard");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      balanceDue: Number(order.balanceDue),
    };
  } catch (error: any) {
    console.error("createOrderAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create custom jewellery order.",
    };
  }
}

export interface RecordAdvanceActionInput {
  orderId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export async function recordAdvanceReceiptAction(input: RecordAdvanceActionInput) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const advance = await recordAdvanceReceipt({
      tenantId,
      customerId: input.customerId,
      orderId: input.orderId,
      amount: input.amount,
      method: input.paymentMethod,
      reference: input.reference,
      notes: input.notes,
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: input.orderId },
    });

    revalidatePath("/orders");
    revalidatePath("/customers");

    return {
      success: true,
      advanceId: advance.id,
      receiptNumber: `ADV-${advance.id.slice(-6).toUpperCase()}`,
      balanceDue: updatedOrder ? Number(updatedOrder.balanceDue) : 0,
    };
  } catch (error: any) {
    console.error("recordAdvanceReceiptAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to record advance receipt.",
    };
  }
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const order = await transitionOrderStatus(tenantId, orderId, status);

    revalidatePath("/orders");

    return { success: true, status: order.status };
  } catch (error: any) {
    console.error("updateOrderStatusAction error:", error);
    return { success: false, error: error?.message || "Failed to update order status." };
  }
}
