"use server";

import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { finalizeSale, FinalizeSaleInput } from "@/server/sales/pos";
import { revalidatePath } from "next/cache";

export async function finalizePOSSaleAction(
  input: Omit<FinalizeSaleInput, "tenantId" | "userId" | "branchId"> & { branchId?: string }
) {
  try {
    const { session, tenantId } = await getActiveTenantContext();
    if (!tenantId) {
      return { success: false, error: "No active tenant context found." };
    }

    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    });

    const result = await finalizeSale({
      ...input,
      tenantId,
      branchId: input.branchId || branch?.id || "branch-main",
      userId: session.userId,
    });

    // Revalidate dashboard routes that display stock or financial data
    revalidatePath("/billing");
    revalidatePath("/invoices");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      invoiceNumber: result.invoiceNumber,
      saleId: result.sale.id,
      totalNetAmount: result.totalNetAmount,
      totalGoldWeightSold: result.totalGoldWeightSold,
    };
  } catch (error: any) {
    console.error("finalizePOSSaleAction error:", error);
    return {
      success: false,
      error: error?.message || "Failed to finalize sale in database.",
    };
  }
}

export async function searchProductsAction(query: string) {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return [];

    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
          { huid: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        inventory: true,
        purity: true,
        category: true,
        metal: true,
      },
      take: 15,
    });

    return products.map((p) => ({
      id: p.id,
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category.name,
      metal: p.metal.name,
      purity: p.purity?.name ?? "22K",
      barcode: p.barcode ?? p.sku,
      huid: p.huid ?? "",
      grossWeight: Number(p.grossWeight),
      stoneWeight: Number(p.stoneWeight),
      netWeight: Number(p.netWeight),
      wastageType: p.wastageType,
      wastageValue: Number(p.wastageValue),
      makingChargeType: p.makingChargeType,
      makingChargeValue: Number(p.makingChargeValue),
      stoneChargeFixed: Number(p.stoneChargeFixed),
      goldRate: 6120,
      qty: 1,
      discount: 0,
      stockQty: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
    }));
  } catch (error) {
    console.error("searchProductsAction error:", error);
    return [];
  }
}

export async function fetchCustomersAction() {
  try {
    const { tenantId } = await getActiveTenantContext();
    if (!tenantId) return [];

    return await prisma.customer.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        panNumber: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  } catch (error) {
    console.error("fetchCustomersAction error:", error);
    return [];
  }
}
