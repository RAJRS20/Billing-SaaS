import { Prisma, SaleStatus, InvTxnType, PaymentMethod } from "@prisma/client";
import prisma from "../../lib/prisma.ts";
import { recordInventoryMovement } from "../inventory/ledger.ts";
import { postJournalEntry } from "../accounting/journal.ts";

export interface ReturnItemInput {
  saleItemId: string;
  quantity: number;
}

export interface ProcessSaleReturnInput {
  tenantId: string;
  branchId: string;
  saleId: string;
  items: ReturnItemInput[];
  refundAmount: number;
  refundMethod: "CASH" | "UPI" | "CREDIT_NOTE";
  reason: string;
  userId: string;
}

/**
 * Process a verified Sales Return.
 * Restores inventory stock via SALE_RETURN_IN, preserves original invoice history,
 * issues refund or credit note, and posts reverse accounting journal entries.
 */
export async function processSaleReturn(input: ProcessSaleReturnInput) {
  const {
    tenantId,
    branchId,
    saleId,
    items,
    refundAmount,
    refundMethod,
    reason,
    userId,
  } = input;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify original sale
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
      },
    });

    if (!sale || sale.tenantId !== tenantId) {
      throw new Error("SALE_NOT_FOUND: Original sale invoice not found for tenant.");
    }

    // 2. Create SaleReturn record
    const saleReturn = await tx.saleReturn.create({
      data: {
        tenantId,
        saleId: sale.id,
        returnDate: new Date(),
        reason,
        refundAmount,
        refundMethod,
      },
    });

    // 3. Create SaleReturnItems and restore inventory stock
    for (const retItem of items) {
      const originalSaleItem = sale.items.find((si) => si.id === retItem.saleItemId);
      if (!originalSaleItem) {
        throw new Error(`ITEM_NOT_FOUND: Sale item ${retItem.saleItemId} not found on this invoice.`);
      }

      await tx.saleReturnItem.create({
        data: {
          saleReturnId: saleReturn.id,
          saleItemId: originalSaleItem.id,
          quantity: retItem.quantity,
        },
      });

      // Restore inventory movement (SALE_RETURN_IN)
      await recordInventoryMovement(
        {
          tenantId,
          branchId,
          productId: originalSaleItem.productId,
          type: InvTxnType.SALE_RETURN_IN,
          quantityChange: retItem.quantity,
          grossWeightChange: Number(originalSaleItem.grossWeight) * retItem.quantity,
          stoneWeightChange: Number(originalSaleItem.stoneWeight) * retItem.quantity,
          netWeightChange: Number(originalSaleItem.netWeight) * retItem.quantity,
          referenceId: saleReturn.id,
          referenceType: "RETURN",
          reason: `Customer return on invoice ${sale.invoiceNumber}: ${reason}`,
          userId,
        },
        tx
      );
    }

    // 4. Update Sale status
    const allItemsReturned = items.length === sale.items.length;
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: allItemsReturned ? SaleStatus.RETURNED : SaleStatus.PARTIALLY_RETURNED,
      },
    });

    // 5. Post Reverse Accounting Journal
    const accounts = await tx.account.findMany({ where: { tenantId } });
    const revenueAcc = accounts.find((a) => a.code === "4010");
    const cashAcc = accounts.find((a) => a.code === "1010");
    const bankAcc = accounts.find((a) => a.code === "1020");

    if (revenueAcc && refundAmount > 0) {
      const assetAcc = refundMethod === "CASH" ? cashAcc : bankAcc;
      if (assetAcc) {
        await postJournalEntry(
          {
            tenantId,
            description: `Sales Return Refund - Invoice ${sale.invoiceNumber}`,
            referenceId: saleReturn.id,
            referenceType: "REFUND",
            lines: [
              { accountId: revenueAcc.id, debit: refundAmount, credit: 0 },
              { accountId: assetAcc.id, debit: 0, credit: refundAmount },
            ],
          },
          tx
        );
      }
    }

    return saleReturn;
  });
}
