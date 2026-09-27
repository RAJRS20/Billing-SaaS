import prisma from "../../lib/prisma.ts";
import { InvTxnType } from "@prisma/client";

export interface GoldReconciliationResult {
  purity: string;
  openingGrams: number;
  purchaseInGrams: number;
  oldGoldInGrams: number;
  salesOutGrams: number;
  returnsInGrams: number;
  karigarIssueGrams: number;
  adjustmentGrams: number;
  expectedClosingGrams: number;
  physicalCountGrams?: number;
  varianceGrams?: number;
}

/**
 * Compute Mathematical Gold Weight Reconciliation from the immutable database ledger:
 * Expected = Opening + Purchases + Old Gold + Returns − Sales − Karigar ± Adjustments
 */
export async function getGoldReconciliationReport(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };

  const movements = await prisma.inventoryTransaction.findMany({
    where: {
      tenantId,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
    include: {
      tenant: true,
    },
  });

  const purityGroups = new Map<string, GoldReconciliationResult>();

  for (const m of movements) {
    const purity = m.purityName || "22K (Standard)";
    if (!purityGroups.has(purity)) {
      purityGroups.set(purity, {
        purity,
        openingGrams: 0,
        purchaseInGrams: 0,
        oldGoldInGrams: 0,
        salesOutGrams: 0,
        returnsInGrams: 0,
        karigarIssueGrams: 0,
        adjustmentGrams: 0,
        expectedClosingGrams: 0,
      });
    }

    const row = purityGroups.get(purity)!;
    const grossWeight = Math.abs(Number(m.grossWeightChange));

    switch (m.type) {
      case InvTxnType.OPENING_STOCK:
        row.openingGrams += grossWeight;
        break;
      case InvTxnType.PURCHASE_IN:
        row.purchaseInGrams += grossWeight;
        break;
      case InvTxnType.OLD_GOLD_IN:
        row.oldGoldInGrams += grossWeight;
        break;
      case InvTxnType.SALE_RETURN_IN:
        row.returnsInGrams += grossWeight;
        break;
      case InvTxnType.SALE_OUT:
        row.salesOutGrams += grossWeight;
        break;
      case InvTxnType.KARIGAR_ISSUE:
        row.karigarIssueGrams += grossWeight;
        break;
      case InvTxnType.ADJUSTMENT_IN:
        row.adjustmentGrams += grossWeight;
        break;
      case InvTxnType.ADJUSTMENT_OUT:
        row.adjustmentGrams -= grossWeight;
        break;
      default:
        break;
    }
  }

  // Calculate expected closing for each purity
  for (const row of purityGroups.values()) {
    row.expectedClosingGrams =
      Math.round(
        (row.openingGrams +
          row.purchaseInGrams +
          row.oldGoldInGrams +
          row.returnsInGrams -
          row.salesOutGrams -
          row.karigarIssueGrams +
          row.adjustmentGrams) *
          1000
      ) / 1000;
  }

  return Array.from(purityGroups.values());
}

/**
 * Aggregate Period Sales Revenue, Gross Profit, and Payment Mode totals from Sale records.
 */
export async function getSalesReport(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      ...(startDate && { invoiceDate: { gte: startDate, lte: endDate ?? new Date() } }),
    },
    include: {
      payments: true,
      items: true,
    },
    orderBy: { invoiceDate: "desc" },
  });

  const totalSalesVolume = sales.length;
  let totalGrossAmount = 0;
  let totalTaxAmount = 0;
  let totalNetAmount = 0;
  let totalCashAmount = 0;
  let totalDigitalAmount = 0;
  let totalGoldWeightSold = 0;

  for (const s of sales) {
    totalGrossAmount += Number(s.grossAmount);
    totalTaxAmount += Number(s.totalTaxAmount);
    totalNetAmount += Number(s.netAmount);

    for (const p of s.payments) {
      if (p.method === "CASH") {
        totalCashAmount += Number(p.amount);
      } else {
        totalDigitalAmount += Number(p.amount);
      }
    }

    for (const item of s.items) {
      totalGoldWeightSold += Number(item.grossWeight);
    }
  }

  return {
    totalSalesVolume,
    totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    totalNetAmount: Math.round(totalNetAmount * 100) / 100,
    totalCashAmount: Math.round(totalCashAmount * 100) / 100,
    totalDigitalAmount: Math.round(totalDigitalAmount * 100) / 100,
    totalGoldWeightSold: Math.round(totalGoldWeightSold * 1000) / 1000,
    sales,
  };
}

/**
 * Period P&L calculation: Gross Sales - Cost of Goods (Purchases) - Showroom Operating Expenses.
 */
export async function getProfitAndLossReport(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };

  const [salesAgg, purchasesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        tenantId,
        ...(Object.keys(dateFilter).length > 0 && { invoiceDate: dateFilter }),
      },
      _sum: { netAmount: true, totalTaxAmount: true, grossAmount: true },
    }),
    prisma.purchase.aggregate({
      where: {
        tenantId,
        ...(Object.keys(dateFilter).length > 0 && { purchaseDate: dateFilter }),
      },
      _sum: { netAmount: true },
    }),
    prisma.expense.aggregate({
      where: {
        tenantId,
        ...(Object.keys(dateFilter).length > 0 && { expenseDate: dateFilter }),
      },
      _sum: { amount: true },
    }),
  ]);

  const grossSales = Number(salesAgg._sum.netAmount ?? 0);
  const cogs = Number(purchasesAgg._sum.netAmount ?? 0);
  const grossProfit = Math.round((grossSales - cogs) * 100) / 100;
  const operatingExpenses = Number(expensesAgg._sum.amount ?? 0);
  const netOperatingProfit = Math.round((grossProfit - operatingExpenses) * 100) / 100;
  const netMarginPct = grossSales > 0 ? Math.round((netOperatingProfit / grossSales) * 1000) / 10 : 0;

  return {
    grossSales,
    cogs,
    grossProfit,
    operatingExpenses,
    netOperatingProfit,
    netMarginPct,
  };
}

