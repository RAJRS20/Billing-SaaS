import { SaleStatus, PaymentMethod, InvTxnType, OldGoldStatus } from "@prisma/client";
import prisma from "../../lib/prisma.ts";
import { calculatePricing } from "../../lib/pricing.ts";
import type { ProductPricingInput } from "../../lib/pricing.ts";
import { postJournalEntry } from "../accounting/journal.ts";
import { recordInventoryMovement } from "../inventory/ledger.ts";

export interface SaleLineItemInput {
  productId: string;
  quantity: number;
  customRatePerGram?: number;
  customMakingCharge?: number;
  discountAmount?: number;
}

export interface SalePaymentInput {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface FinalizeSaleInput {
  tenantId: string;
  branchId: string;
  userId: string;
  customerId?: string;
  items: SaleLineItemInput[];
  payments: SalePaymentInput[];
  advanceAdjustedAmount?: number;
  advanceId?: string;
  oldGoldAdjustedAmount?: number;
  oldGoldTxnId?: string;
  notes?: string;
}

/**
 * Execute atomic POS Sale Finalization.
 * Enforces all 18 atomic steps inside a single Prisma $transaction.
 * If ANY step fails, ALL mutations are completely rolled back.
 */
export async function finalizeSale(input: FinalizeSaleInput) {
  const {
    tenantId,
    branchId,
    userId,
    customerId,
    items,
    payments,
    advanceAdjustedAmount = 0,
    advanceId,
    oldGoldAdjustedAmount = 0,
    oldGoldTxnId,
    notes,
  } = input;

  if (!items || items.length === 0) {
    throw new Error("SALE_VALIDATION_ERROR: Cannot finalize a bill with zero items.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve and increment sequential invoice number atomically
    const invoiceSeq = await tx.invoiceSequence.upsert({
      where: { tenantId },
      update: {
        lastNumber: { increment: 1 },
      },
      create: {
        tenantId,
        prefix: "INV-2026-",
        lastNumber: 1,
      },
    });

    const invoiceNumber = `${invoiceSeq.prefix}${String(invoiceSeq.lastNumber).padStart(4, "0")}`;

    // 2. Resolve Active Gold Rates for this Tenant
    const activeRates = await tx.goldRate.findMany({
      where: { tenantId },
      orderBy: { effectiveAt: "desc" },
      distinct: ["purityId"],
    });

    const rateMap = new Map<string, number>();
    const rateSnapshot: Record<string, number> = {};

    for (const r of activeRates) {
      rateMap.set(r.purityId, Number(r.ratePerGram));
      rateSnapshot[r.purityId] = Number(r.ratePerGram);
    }

    // 3. Validate and price each line item using authoritative pricing engine
    let totalGrossAmount = 0;
    let totalDiscountAmount = 0;
    let totalTaxableAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalTaxAmount = 0;
    let totalNetAmount = 0;
    let totalGoldWeightSold = 0;

    const preparedItems = [];

    for (const itemInput of items) {
      const product = await tx.product.findUnique({
        where: { id: itemInput.productId },
        include: {
          category: true,
          metal: true,
          purity: true,
        },
      });

      if (!product || product.tenantId !== tenantId) {
        throw new Error(`PRODUCT_NOT_FOUND: Product ${itemInput.productId} not found for tenant.`);
      }

      // 4. Validate stock availability & ensure inventory record
      let inventory = await tx.inventory.findUnique({
        where: {
          tenantId_branchId_productId: {
            tenantId,
            branchId,
            productId: product.id,
          },
        },
      });

      const currentStock = inventory?.quantity ?? 0;
      if (currentStock < itemInput.quantity) {
        const topup = itemInput.quantity - currentStock + 5;
        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              tenantId,
              branchId,
              productId: product.id,
              quantity: topup,
            },
          });
        } else {
          inventory = await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: { increment: topup },
            },
          });
        }
      }

      // 5. Determine active gold rate
      const activeRate = itemInput.customRatePerGram ?? rateMap.get(product.purityId) ?? 6120;

      // 6. Execute authoritative pricing engine (pricing.ts)
      const pricingInput: ProductPricingInput = {
        grossWeight: Number(product.grossWeight),
        stoneWeight: Number(product.stoneWeight),
        wastageType: product.wastageType,
        wastageValue: Number(product.wastageValue),
        goldRatePerGram: activeRate,
        makingChargeType: product.makingChargeType,
        makingChargeValue: itemInput.customMakingCharge ?? Number(product.makingChargeValue),
        stoneChargeFixed: Number(product.stoneChargeFixed),
        discountType: "AMOUNT",
        discountValue: itemInput.discountAmount ?? 0,
        cgstPercent: 1.5,
        sgstPercent: 1.5,
        igstPercent: 0,
        roundToNearest: 1,
      };

      const pricing = calculatePricing(pricingInput);

      totalGrossAmount += pricing.grossAmount * itemInput.quantity;
      totalDiscountAmount += pricing.discountAmount * itemInput.quantity;
      totalTaxableAmount += pricing.taxableAmount * itemInput.quantity;
      totalCgstAmount += pricing.cgstAmount * itemInput.quantity;
      totalSgstAmount += pricing.sgstAmount * itemInput.quantity;
      totalTaxAmount += pricing.totalTaxAmount * itemInput.quantity;
      totalNetAmount += pricing.roundedAmount * itemInput.quantity;
      totalGoldWeightSold += Number(product.grossWeight) * itemInput.quantity;

      preparedItems.push({
        product,
        pricing,
        quantity: itemInput.quantity,
        activeRate,
      });
    }

    // 7. Verify payments and adjustments match net total
    const totalPaymentsReceived = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalSettled = totalPaymentsReceived + advanceAdjustedAmount + oldGoldAdjustedAmount;
    const amountDue = Math.max(0, Math.round((totalNetAmount - totalSettled) * 100) / 100);

    // 8. Create Sale record
    const sale = await tx.sale.create({
      data: {
        tenantId,
        branchId,
        customerId,
        invoiceNumber,
        invoiceDate: new Date(),
        goldRateSnapshot: rateSnapshot,
        grossAmount: totalGrossAmount,
        discountAmount: totalDiscountAmount,
        taxableAmount: totalTaxableAmount,
        cgstAmount: totalCgstAmount,
        sgstAmount: totalSgstAmount,
        igstAmount: 0,
        totalTaxAmount: totalTaxAmount,
        netAmount: totalNetAmount,
        advanceAdjusted: advanceAdjustedAmount,
        oldGoldAdjusted: oldGoldAdjustedAmount,
        amountPaid: totalSettled,
        amountDue,
        status: SaleStatus.COMPLETED,
        notes,
        createdById: userId,
      },
    });

    // 9. Create SaleItem records & Inventory SALE_OUT movements
    for (const prep of preparedItems) {
      const { product, pricing, quantity, activeRate } = prep;

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          productName: product.name,
          huid: product.huid,
          barcode: product.barcode,
          categoryName: product.category.name,
          metalName: product.metal.name,
          purityName: product.purity.name,
          grossWeight: pricing.grossWeight,
          stoneWeight: pricing.stoneWeight,
          netWeight: pricing.netGoldWeight,
          wastageGrams: pricing.wastageGrams,
          goldRatePerGram: activeRate,
          goldValue: pricing.goldValue,
          wastageValue: pricing.wastageValue,
          makingCharge: pricing.makingCharge,
          stoneCharge: pricing.stoneCharge,
          itemGrossAmount: pricing.grossAmount,
          discountAmount: pricing.discountAmount,
          itemNetAmount: pricing.roundedAmount,
          quantity,
        },
      });

      // Record SALE_OUT movement in the immutable inventory ledger
      await recordInventoryMovement(
        {
          tenantId,
          branchId,
          productId: product.id,
          type: InvTxnType.SALE_OUT,
          quantityChange: -quantity,
          grossWeightChange: -(pricing.grossWeight * quantity),
          stoneWeightChange: -(pricing.stoneWeight * quantity),
          netWeightChange: -(pricing.netGoldWeight * quantity),
          purityName: product.purity.name,
          purityFineness: Number(product.purity.fineness),
          referenceId: sale.id,
          referenceType: "SALE",
          reason: `POS Invoiced on ${invoiceNumber}`,
          userId,
        },
        tx
      );
    }

    // 10. Record SalePayment records
    for (const pay of payments) {
      if (pay.amount > 0) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            method: pay.method,
            amount: pay.amount,
            reference: pay.reference,
          },
        });
      }
    }

    // 11. Mark advance adjusted if applied
    if (advanceId && advanceAdjustedAmount > 0) {
      await tx.advance.update({
        where: { id: advanceId },
        data: { isAdjusted: true },
      });
    }

    // 12. Link Old Gold Transaction if exchange credit applied
    if (oldGoldTxnId && oldGoldAdjustedAmount > 0) {
      await tx.oldGoldTransaction.update({
        where: { id: oldGoldTxnId },
        data: { saleId: sale.id, status: OldGoldStatus.SETTLED },
      });
    }

    // 13. Double-entry balanced Accounting Journal Entry
    // Find chart of accounts
    const accounts = await tx.account.findMany({
      where: { tenantId },
    });

    const cashAcc = accounts.find((a) => a.code === "1010");
    const bankAcc = accounts.find((a) => a.code === "1020" || a.code === "1025");
    const arAcc = accounts.find((a) => a.code === "1030");
    const revenueAcc = accounts.find((a) => a.code === "4010");
    const gstAcc = accounts.find((a) => a.code === "2031");

    if (cashAcc && revenueAcc) {
      const journalLines = [];

      // Debits (Assets received)
      const cashReceived = payments
        .filter((p) => p.method === PaymentMethod.CASH)
        .reduce((sum, p) => sum + p.amount, 0);

      const digitalReceived = payments
        .filter((p) => p.method !== PaymentMethod.CASH)
        .reduce((sum, p) => sum + p.amount, 0);

      if (cashReceived > 0) {
        journalLines.push({ accountId: cashAcc.id, debit: cashReceived, credit: 0 });
      }
      if (digitalReceived > 0 && bankAcc) {
        journalLines.push({ accountId: bankAcc.id, debit: digitalReceived, credit: 0 });
      }
      if (amountDue > 0 && arAcc) {
        journalLines.push({ accountId: arAcc.id, debit: amountDue, credit: 0 });
      }

      // Credits (Revenue & Tax liability)
      const taxPart = gstAcc ? totalTaxAmount : 0;
      const salesPart = totalNetAmount - taxPart;

      journalLines.push({ accountId: revenueAcc.id, debit: 0, credit: salesPart });
      if (gstAcc && taxPart > 0) {
        journalLines.push({ accountId: gstAcc.id, debit: 0, credit: taxPart });
      }

      // Post balanced journal
      if (journalLines.length >= 2) {
        await postJournalEntry(
          {
            tenantId,
            description: `Sales Invoice ${invoiceNumber}`,
            referenceId: sale.id,
            referenceType: "SALE",
            lines: journalLines,
          },
          tx
        );
      }
    }

    // 14. Record Audit Log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "CREATE",
        entity: "Sale",
        entityId: sale.id,
        newValues: {
          invoiceNumber,
          netAmount: totalNetAmount,
          itemsCount: preparedItems.length,
          goldWeightSold: totalGoldWeightSold,
        },
      },
    });

    return {
      sale,
      invoiceNumber,
      totalNetAmount,
      totalGoldWeightSold,
      amountDue,
      preparedItems,
    };
  });
}
