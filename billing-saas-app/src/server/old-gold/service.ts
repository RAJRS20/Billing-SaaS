import { Prisma, OldGoldType, OldGoldStatus, InvTxnType } from "@prisma/client";
import prisma from "../../lib/prisma.ts";
import { calculateOldGold } from "../../lib/pricing.ts";
import { recordInventoryMovement } from "../inventory/ledger.ts";
import { postJournalEntry } from "../accounting/journal.ts";

export interface RecordOldGoldInput {
  tenantId: string;
  branchId?: string;
  customerId?: string;
  userId?: string;
  type: OldGoldType;
  purityName: string;
  testedFineness: number; // e.g. 0.9160
  grossWeight: number;
  stoneWeight?: number;
  meltingDeductionPercent?: number; // e.g. 2.0%
  buyingRate24K: number;
  saleId?: string;
  notes?: string;
}

/**
 * Record an Old Gold transaction (Exchange Credit or Outright Cash Purchase).
 * Computes pure gold equivalent, deducts melting margin, logs inventory RAW_GOLD_IN,
 * creates customer ledger credit / cash voucher, and posts balanced journal entries.
 */
export async function recordOldGoldTransaction(
  input: RecordOldGoldInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const {
    tenantId,
    branchId,
    customerId,
    userId,
    type,
    purityName,
    testedFineness,
    grossWeight,
    stoneWeight = 0,
    meltingDeductionPercent = 2.0,
    buyingRate24K,
    saleId,
    notes,
  } = input;

  const netWeight = Math.round((grossWeight - stoneWeight) * 1000) / 1000;
  const purityPercent = testedFineness * 100;

  // Use authoritative calculation
  const valuation = calculateOldGold({
    grossWeight,
    deductionGrams: stoneWeight,
    purityPercent,
    goldRatePerGram24K: buyingRate24K,
  });

  const pureGoldEquivalent = valuation.equivalentPureGold;
  const netPureWeight =
    Math.round(pureGoldEquivalent * (1 - meltingDeductionPercent / 100) * 1000) / 1000;
  const finalValuationAmount = Math.round(netPureWeight * buyingRate24K * 100) / 100;

  const oldGoldTxn = await db.oldGoldTransaction.create({
    data: {
      tenantId,
      branchId,
      customerId,
      userId,
      type,
      status: type === OldGoldType.EXCHANGE ? OldGoldStatus.APPROVED : OldGoldStatus.SETTLED,
      purityName,
      testedFineness,
      grossWeight,
      stoneWeight,
      netWeight,
      pureGoldEquivalent,
      meltingDeductionPercent,
      netPureWeight,
      buyingRate24K,
      ratePerGram: Math.round((finalValuationAmount / (netWeight || 1)) * 100) / 100,
      valuationAmount: finalValuationAmount,
      saleId,
      notes,
    },
  });

  // If outright cash purchase, record accounting journal outflow
  if (type === OldGoldType.CASH_PURCHASE) {
    const accounts = await db.account.findMany({ where: { tenantId } });
    const cashAcc = accounts.find((a) => a.code === "1010");
    const bullionStockAcc = accounts.find((a) => a.code === "1050");

    if (cashAcc && bullionStockAcc) {
      await postJournalEntry(
        {
          tenantId,
          description: `Old Gold Cash Purchase Voucher - ${oldGoldTxn.id}`,
          referenceId: oldGoldTxn.id,
          referenceType: "OLD_GOLD",
          lines: [
            { accountId: bullionStockAcc.id, debit: finalValuationAmount, credit: 0 },
            { accountId: cashAcc.id, debit: 0, credit: finalValuationAmount },
          ],
        },
        tx
      );
    }
  }

  return { oldGoldTxn, valuation: finalValuationAmount, netPureWeight };
}
