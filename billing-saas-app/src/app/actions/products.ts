"use server";

import { getActiveTenantContext } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateProductInput {
  name: string;
  categoryId: string;
  purityId: string;
  metalId: string;
  huid?: string;
  grossWeight: number;
  stoneWeight: number;
  makingChargeType?: "PER_GRAM" | "PERCENTAGE" | "FIXED";
  makingChargeValue: number;
  initialStockQty?: number;
  branchId?: string;
}

export async function createProductAction(input: CreateProductInput) {
  try {
    const { session, tenantId } = await getActiveTenantContext();

    if (!input.name || input.name.trim() === "") {
      throw new Error("Product name is required.");
    }
    if (input.grossWeight <= 0) {
      throw new Error("Gross weight must be greater than zero.");
    }

    const netWeight = Math.max(0, input.grossWeight - (input.stoneWeight || 0));
    const sku = `JW-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const barcode = `890${Date.now().toString().slice(-9)}`;

    const product = await prisma.$transaction(async (tx) => {
      const branches = await tx.branch.findMany({ where: { tenantId } });
      const branchId = input.branchId || branches[0]?.id;

      const p = await tx.product.create({
        data: {
          tenantId,
          branchId,
          categoryId: input.categoryId,
          purityId: input.purityId,
          metalId: input.metalId,
          sku,
          name: input.name.trim(),
          barcode,
          huid: input.huid ? input.huid.trim().toUpperCase() : null,
          grossWeight: input.grossWeight,
          stoneWeight: input.stoneWeight || 0,
          netWeight,
          makingChargeType: input.makingChargeType || "PER_GRAM",
          makingChargeValue: input.makingChargeValue || 0,
        },
      });

      if (branchId && (input.initialStockQty ?? 0) > 0) {
        await tx.inventory.create({
          data: {
            tenantId,
            branchId,
            productId: p.id,
            quantity: input.initialStockQty || 1,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            branchId,
            productId: p.id,
            type: "OPENING_STOCK",
            quantityChange: input.initialStockQty || 1,
            grossWeightChange: input.grossWeight * (input.initialStockQty || 1),
            netWeightChange: netWeight * (input.initialStockQty || 1),
            notes: "Initial product inward",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          action: "CREATE_PRODUCT",
          entity: "Product",
          entityId: p.id,
          newValues: { name: p.name, sku: p.sku },
        },
      });

      return p;
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/billing");
    revalidatePath("/dashboard");

    return { success: true, product };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create product." };
  }
}
