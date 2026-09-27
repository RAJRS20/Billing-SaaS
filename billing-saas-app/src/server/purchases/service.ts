import { Prisma, PurchaseStatus, PaymentMethod, InvTxnType } from "@prisma/client";
import prisma from "../../lib/prisma.ts";
import { recordInventoryMovement } from "../inventory/ledger.ts";
import { postJournalEntry } from "../accounting/journal.ts";

export interface PurchaseLineItemInput {
  productId: string;
  quantity: number;
  grossWeight: number;
  stoneWeight?: number;
  netWeight: number;
  ratePerGram: number;
  totalCost: number;
}

export interface RecordPurchaseInwardInput {
  tenantId: string;
  branchId: string;
  supplierId: string;
  purchaseNumber?: string;
  purchaseDate?: Date;
  items: PurchaseLineItemInput[];
  taxAmount?: number;
  amountPaid?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  userId?: string;
}

/**
 * Record a Goods Inward Purchase Order from Bullion/Jewellery Supplier.
 * Updates stock with PURCHASE_IN, credits supplier payable ledger, and posts balanced accounting entries.
 */
export async function recordPurchaseInward(input: RecordPurchaseInwardInput) {
  const {
    tenantId,
    branchId,
    supplierId,
    items,
    taxAmount = 0,
    amountPaid = 0,
    paymentMethod = PaymentMethod.BANK_TRANSFER,
    paymentReference,
    notes,
    userId,
  } = input;

  if (!items || items.length === 0) {
    throw new Error("PURCHASE_VALIDATION_ERROR: Cannot record purchase with zero items.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Calculate totals
    let grossAmount = 0;
    for (const item of items) {
      grossAmount += item.totalCost;
    }

    const netAmount = grossAmount + taxAmount;
    const amountDue = Math.max(0, netAmount - amountPaid);

    const purchaseNumber =
      input.purchaseNumber ??
      `PO-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // 2. Create Purchase record
    const purchase = await tx.purchase.create({
      data: {
        tenantId,
        branchId,
        supplierId,
        purchaseNumber,
        purchaseDate: input.purchaseDate ?? new Date(),
        grossAmount,
        taxAmount,
        netAmount,
        amountPaid,
        amountDue,
        status: PurchaseStatus.COMPLETED,
        notes,
      },
    });

    // 3. Create PurchaseItems & record PURCHASE_IN inventory movements
    for (const item of items) {
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight ?? 0,
          netWeight: item.netWeight,
          ratePerGram: item.ratePerGram,
          unitCost: Math.round((item.totalCost / (item.quantity || 1)) * 100) / 100,
          totalCost: item.totalCost,
        },
      });

      // Record inward inventory movement
      await recordInventoryMovement(
        {
          tenantId,
          branchId,
          productId: item.productId,
          type: InvTxnType.PURCHASE_IN,
          quantityChange: item.quantity,
          grossWeightChange: item.grossWeight,
          stoneWeightChange: item.stoneWeight ?? 0,
          netWeightChange: item.netWeight,
          referenceId: purchase.id,
          referenceType: "PURCHASE",
          reason: `Supplier Inward PO ${purchaseNumber}`,
          userId,
        },
        tx
      );
    }

    // 4. Record payment if paid
    if (amountPaid > 0) {
      await tx.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          method: paymentMethod,
          amount: amountPaid,
          reference: paymentReference,
        },
      });
    }

    // 5. Post Double-Entry Accounting Journal
    const accounts = await tx.account.findMany({ where: { tenantId } });
    const inventoryStockAcc = accounts.find((a) => a.code === "1040");
    const apAcc = accounts.find((a) => a.code === "2010");
    const bankAcc = accounts.find((a) => a.code === "1020");

    if (inventoryStockAcc && apAcc) {
      const journalLines = [
        { accountId: inventoryStockAcc.id, debit: netAmount, credit: 0 },
        { accountId: apAcc.id, debit: 0, credit: netAmount },
      ];

      // If partial/full payment was made at inwarding:
      if (amountPaid > 0 && bankAcc) {
        journalLines.push(
          { accountId: apAcc.id, debit: amountPaid, credit: 0 },
          { accountId: bankAcc.id, debit: 0, credit: amountPaid }
        );
      }

      await postJournalEntry(
        {
          tenantId,
          description: `Supplier Purchase Inward ${purchaseNumber}`,
          referenceId: purchase.id,
          referenceType: "PURCHASE",
          lines: journalLines,
        },
        tx
      );
    }

    return { purchase, purchaseNumber, netAmount, amountDue };
  });
}

export interface RecordSupplierPaymentInput {
  tenantId: string;
  branchId: string;
  purchaseId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  userId?: string;
}

export async function recordSupplierPayment(input: RecordSupplierPaymentInput) {
  const { tenantId, purchaseId, amount, paymentMethod, paymentReference } = input;
  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase || purchase.tenantId !== tenantId) {
      throw new Error("PURCHASE_NOT_FOUND: Purchase record not found.");
    }

    const currentDue = Number(purchase.amountDue);
    if (amount <= 0 || amount > currentDue) {
      throw new Error(`INVALID_PAYMENT_AMOUNT: Amount ₹${amount} exceeds current due ₹${currentDue}.`);
    }

    const newAmountPaid = Number(purchase.amountPaid) + amount;
    const newAmountDue = Math.max(0, currentDue - amount);

    const payment = await tx.purchasePayment.create({
      data: {
        purchaseId: purchase.id,
        method: paymentMethod,
        amount,
        reference: paymentReference,
      },
    });

    const updatedPurchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
      },
    });

    // Accounting: Debit Accounts Payable (2010), Credit Bank (1020)
    const accounts = await tx.account.findMany({ where: { tenantId } });
    const apAcc = accounts.find((a) => a.code === "2010");
    const bankAcc = accounts.find((a) => a.code === "1020");

    if (apAcc && bankAcc) {
      await postJournalEntry(
        {
          tenantId,
          description: `Supplier Payment for PO ${purchase.purchaseNumber}`,
          referenceId: purchase.id,
          referenceType: "PURCHASE",
          lines: [
            { accountId: apAcc.id, debit: amount, credit: 0 },
            { accountId: bankAcc.id, debit: 0, credit: amount },
          ],
        },
        tx
      );
    }

    return { payment, purchase: updatedPurchase };
  });
}

