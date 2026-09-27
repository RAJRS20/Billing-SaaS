import { Prisma, InvTxnType } from "@prisma/client";
import prisma from "../../lib/prisma.ts";

export interface RecordMovementInput {
  tenantId: string;
  branchId: string;
  productId: string;
  type: InvTxnType;
  quantityChange: number;
  grossWeightChange?: number;
  stoneWeightChange?: number;
  netWeightChange?: number;
  purityName?: string;
  purityFineness?: number;
  referenceId?: string;
  referenceType?: "SALE" | "PURCHASE" | "ADJUSTMENT" | "TRANSFER" | "RETURN" | "KARIGAR" | "OLD_GOLD";
  reason?: string;
  userId?: string;
  notes?: string;
}

/**
 * Record an immutable inventory transaction movement and synchronize the operational inventory balance.
 * Stock balances are never directly modified without this auditable movement record.
 */
export async function recordInventoryMovement(
  input: RecordMovementInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const {
    tenantId,
    branchId,
    productId,
    type,
    quantityChange,
    grossWeightChange = 0,
    stoneWeightChange = 0,
    netWeightChange = 0,
    purityName,
    purityFineness,
    referenceId,
    referenceType,
    reason,
    userId,
    notes,
  } = input;

  // 1. Append immutable inventory transaction
  const txn = await db.inventoryTransaction.create({
    data: {
      tenantId,
      branchId,
      productId,
      type,
      quantityChange,
      grossWeightChange,
      stoneWeightChange,
      netWeightChange,
      purityName,
      purityFineness,
      referenceId,
      referenceType,
      reason,
      userId,
      notes,
    },
  });

  // 2. Atomically update or create current Inventory snapshot
  const currentInventory = await db.inventory.upsert({
    where: {
      tenantId_branchId_productId: {
        tenantId,
        branchId,
        productId,
      },
    },
    update: {
      quantity: {
        increment: quantityChange,
      },
    },
    create: {
      tenantId,
      branchId,
      productId,
      quantity: Math.max(0, quantityChange),
    },
  });

  return { txn, currentInventory };
}

export interface StockAdjustmentInput {
  tenantId: string;
  branchId: string;
  productId: string;
  quantityChange: number;
  grossWeightChange: number;
  stoneWeightChange?: number;
  netWeightChange?: number;
  reason: string;
  notes?: string;
  userId: string;
}

/**
 * Record a manager-authorized stock adjustment.
 * Generates an auditable StockAdjustment record and an ADJUSTMENT_IN / ADJUSTMENT_OUT movement.
 */
export async function recordStockAdjustment(
  input: StockAdjustmentInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const {
    tenantId,
    branchId,
    productId,
    quantityChange,
    grossWeightChange,
    stoneWeightChange = 0,
    netWeightChange = grossWeightChange - stoneWeightChange,
    reason,
    notes,
    userId,
  } = input;

  // Get before balance
  const invBefore = await db.inventory.findUnique({
    where: {
      tenantId_branchId_productId: {
        tenantId,
        branchId,
        productId,
      },
    },
  });

  const quantityBefore = invBefore?.quantity ?? 0;
  const quantityAfter = quantityBefore + quantityChange;

  // 1. Create StockAdjustment record
  const adjustment = await db.stockAdjustment.create({
    data: {
      tenantId,
      branchId,
      productId,
      reason,
      quantityBefore,
      quantityAfter,
      notes,
    },
  });

  // 2. Record inventory movement
  const movementType = quantityChange >= 0 ? InvTxnType.ADJUSTMENT_IN : InvTxnType.ADJUSTMENT_OUT;

  const { txn, currentInventory } = await recordInventoryMovement(
    {
      tenantId,
      branchId,
      productId,
      type: movementType,
      quantityChange,
      grossWeightChange,
      stoneWeightChange,
      netWeightChange,
      referenceId: adjustment.id,
      referenceType: "ADJUSTMENT",
      reason,
      userId,
      notes,
    },
    db
  );

  return { adjustment, txn, currentInventory };
}

/**
 * Derive stock balance directly from the immutable transaction ledger.
 * Proves that snapshot matches total movement history.
 */
export async function deriveLedgerStockFromMovements(
  tenantId: string,
  branchId: string,
  productId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const movements = await db.inventoryTransaction.findMany({
    where: {
      tenantId,
      branchId,
      productId,
    },
    orderBy: { createdAt: "asc" },
  });

  let derivedQuantity = 0;
  let derivedGrossWeight = 0;
  let derivedNetWeight = 0;

  for (const m of movements) {
    derivedQuantity += m.quantityChange;
    derivedGrossWeight += Number(m.grossWeightChange);
    derivedNetWeight += Number(m.netWeightChange);
  }

  const snapshot = await db.inventory.findUnique({
    where: {
      tenantId_branchId_productId: {
        tenantId,
        branchId,
        productId,
      },
    },
  });

  return {
    snapshotQuantity: snapshot?.quantity ?? 0,
    derivedQuantity,
    derivedGrossWeight: Math.round(derivedGrossWeight * 1000) / 1000,
    derivedNetWeight: Math.round(derivedNetWeight * 1000) / 1000,
    isReconciled: snapshot ? snapshot.quantity === derivedQuantity : derivedQuantity === 0,
    totalTransactions: movements.length,
  };
}
