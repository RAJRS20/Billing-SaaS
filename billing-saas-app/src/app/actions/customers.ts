"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateCustomerActionInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  gstin?: string;
  panNumber?: string;
  notes?: string;
}

export async function createCustomerAction(input: CreateCustomerActionInput) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return { success: false, error: "No active tenant context." };

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city || "Chennai",
        gstin: input.gstin,
        panNumber: input.panNumber,
        notes: input.notes,
      },
    });

    revalidatePath("/customers");
    revalidatePath("/billing");
    revalidatePath("/orders");

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? "",
        panNumber: customer.panNumber ?? "",
      },
    };
  } catch (error: any) {
    console.error("createCustomerAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create customer record.",
    };
  }
}

export async function fetchCustomerHistoryAction(customerId: string) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return null;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: {
          select: {
            id: true,
            invoiceNumber: true,
            netAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            estimatedAmount: true,
            advancePaid: true,
            balanceDue: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        advances: {
          select: {
            id: true,
            amount: true,
            method: true,
            isAdjusted: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return customer;
  } catch (error) {
    console.error("fetchCustomerHistoryAction error:", error);
    return null;
  }
}
