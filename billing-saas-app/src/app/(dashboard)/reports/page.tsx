import type { Metadata } from "next";
import ReportsClient, {
  GoldReconciliationRow,
  SalesReportRow,
  InventoryCategoryValuation,
} from "./ReportsClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import {
  getGoldReconciliationReport,
  getProfitAndLossReport,
} from "@/server/reports/service";

export const metadata: Metadata = {
  title: "Reports & Audits",
  description: "Gold weight reconciliation, GST filings, inventory valuation & shift P&L.",
};

export default async function ReportsPage() {
  const { tenantId } = await getActiveTenantContext();

  const [
    dbBranches,
    dbPurities,
    reconResults,
    sales,
    purchases,
    expenses,
    plReport,
    categories,
    products,
    latestShift,
    dbRates,
    storeSetting,
  ] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.purity.findMany({
      where: { tenantId },
      orderBy: { fineness: "desc" },
    }),
    getGoldReconciliationReport(tenantId),
    prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.purchase.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { purchaseDate: "desc" },
    }),
    prisma.expense.findMany({
      where: { tenantId },
      orderBy: { expenseDate: "desc" },
    }),
    getProfitAndLossReport(tenantId),
    prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
    }),
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { inventory: true },
    }),
    prisma.shift.findFirst({
      where: { tenantId },
      include: { user: true },
      orderBy: { openedAt: "desc" },
    }),
    prisma.goldRate.findMany({
      where: { tenantId },
      include: { purity: true },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.storeSetting.findFirst({
      where: { tenantId },
    }),
  ]);

  const rate22K = Number(dbRates.find((r) => r.purity?.name.includes("22"))?.ratePerGram ?? 6120);

  // 1. Build Gold Reconciliation rows
  const goldReconciliationData: GoldReconciliationRow[] = [];
  const reconPurityMap = new Map(reconResults.map((r) => [r.purity, r]));

  // Ensure standard purities exist
  const basePurities = dbPurities.length > 0 ? dbPurities : [
    { name: "24K Fine Gold (999)", fineness: 0.999 },
    { name: "22K Hallmarked (916)", fineness: 0.916 },
    { name: "18K Diamond Jewellery (750)", fineness: 0.750 },
    { name: "14K Fashion Gold (585)", fineness: 0.585 },
  ];

  for (const p of basePurities) {
    const recon = reconPurityMap.get(p.name);
    const opening = recon?.openingGrams ?? 0;
    const purch = recon?.purchaseInGrams ?? 0;
    const og = recon?.oldGoldInGrams ?? 0;
    const salesOut = recon?.salesOutGrams ?? 0;
    const ret = recon?.returnsInGrams ?? 0;
    const karigar = recon?.karigarIssueGrams ?? 0;
    const adj = recon?.adjustmentGrams ?? 0;
    const expected = recon?.expectedClosingGrams ?? Math.round((opening + purch + og + ret - salesOut - karigar + adj) * 1000) / 1000;
    const physical = recon?.physicalCountGrams ?? expected;
    const variance = Math.round((physical - expected) * 100) / 100;

    goldReconciliationData.push({
      purity: p.name,
      fineness: Number(p.fineness),
      openingGrams: opening,
      purchaseInGrams: purch,
      oldGoldInGrams: og,
      salesOutGrams: salesOut,
      returnsInGrams: ret,
      karigarIssueGrams: karigar,
      adjustmentGrams: adj,
      expectedClosingGrams: expected,
      physicalCountGrams: physical,
      varianceGrams: variance,
      status: variance === 0 ? "MATCHED" : variance > 0 ? "EXCESS" : "SHORTAGE",
    });
  }

  // 2. Build Daily Sales Report rows
  const salesByDateMap = new Map<string, SalesReportRow>();
  for (const s of sales) {
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(s.invoiceDate));

    if (!salesByDateMap.has(dateStr)) {
      salesByDateMap.set(dateStr, {
        date: dateStr,
        invoiceCount: 0,
        grossWeight: 0,
        goldValue: 0,
        makingCharges: 0,
        gstAmount: 0,
        totalSales: 0,
        cashAmount: 0,
        digitalAmount: 0,
        exchangeCredit: 0,
      });
    }

    const row = salesByDateMap.get(dateStr)!;
    row.invoiceCount += 1;
    row.totalSales += Number(s.netAmount);
    row.gstAmount += Number(s.totalTaxAmount);

    for (const item of s.items) {
      row.grossWeight += Number(item.grossWeight);
      row.goldValue += Number(item.goldValue);
      row.makingCharges += Number(item.makingCharge);
    }

    for (const p of s.payments) {
      if (p.method === "CASH") {
        row.cashAmount += Number(p.amount);
      } else {
        row.digitalAmount += Number(p.amount);
      }
    }
  }

  const salesReportData = Array.from(salesByDateMap.values()).slice(0, 10);

  // 3. Build Inventory Category Valuation rows
  let totalValuation = 0;
  const catValMap = new Map<string, { itemCount: number; gross: number; net: number; val: number }>();
  for (const c of categories) {
    catValMap.set(c.id, { itemCount: 0, gross: 0, net: 0, val: 0 });
  }

  for (const prod of products) {
    const qty = prod.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    if (!catValMap.has(prod.categoryId)) {
      catValMap.set(prod.categoryId, { itemCount: 0, gross: 0, net: 0, val: 0 });
    }
    const cat = catValMap.get(prod.categoryId)!;
    cat.itemCount += qty;
    cat.gross += Number(prod.grossWeight) * qty;
    cat.net += Number(prod.netWeight) * qty;

    const prodVal = (Number(prod.netWeight) * rate22K + Number(prod.stoneChargeFixed)) * qty;
    cat.val += prodVal;
    totalValuation += prodVal;
  }

  const inventoryValuationData: InventoryCategoryValuation[] = categories.map((c) => {
    const data = catValMap.get(c.id) ?? { itemCount: 0, gross: 0, net: 0, val: 0 };
    const share = totalValuation > 0 ? Math.round((data.val / totalValuation) * 1000) / 10 : 0;
    return {
      category: c.name,
      itemCount: data.itemCount,
      grossWeightGrams: Math.round(data.gross * 100) / 100,
      netWeightGrams: Math.round(data.net * 100) / 100,
      valuationAmount: Math.round(data.val),
      sharePercent: share,
      turnoverDays: share > 30 ? 18 : share > 15 ? 28 : 45,
      status: share > 25 ? "FAST" : share > 10 ? "OPTIMAL" : "SLOW",
    };
  });

  // 4. GST Summary
  const panLimit = Number(storeSetting?.cashPanLimit ?? 200000);
  let totalTaxableValue = 0;
  let totalTax = 0;
  let panCompliantCount = 0;
  let panThresholdCount = 0;

  for (const s of sales) {
    totalTaxableValue += Number(s.grossAmount);
    totalTax += Number(s.totalTaxAmount);
    if (Number(s.netAmount) >= panLimit) {
      panThresholdCount += 1;
    } else {
      panCompliantCount += 1;
    }
  }

  const halfTax = Math.round((totalTax / 2) * 100) / 100;

  // 5. Shift Close Data
  const shiftCashSales = sales.reduce((sum, s) => {
    const cash = s.payments.filter((p) => p.method === "CASH").reduce((cSum, p) => cSum + Number(p.amount), 0);
    return sum + cash;
  }, 0);
  const shiftCashExpenses = expenses.filter((e) => e.method === "CASH").reduce((sum, e) => sum + Number(e.amount), 0);
  const openingFloat = latestShift ? Number(latestShift.openingCash) : 25000;
  const expectedShiftCash = Math.round((openingFloat + shiftCashSales - shiftCashExpenses) * 100) / 100;
  const actualShiftCash = latestShift?.actualCash ? Number(latestShift.actualCash) : expectedShiftCash;

  const shiftData = {
    shiftNumber: latestShift?.shiftNumber ?? 1,
    cashierName: latestShift?.user?.name ?? "Cashier Staff",
    openingCash: openingFloat,
    cashInflow: shiftCashSales,
    oldGoldOutflow: 0,
    expenseOutflow: shiftCashExpenses,
    expectedCash: expectedShiftCash,
    actualCash: actualShiftCash,
    variance: Math.round((actualShiftCash - expectedShiftCash) * 100) / 100,
    status: latestShift?.isLocked ? "Shift Balanced & Locked" : "Active Shift Open",
  };

  return (
    <ReportsClient
      goldReconciliationData={goldReconciliationData}
      salesReportData={salesReportData}
      inventoryValuationData={inventoryValuationData}
      plData={plReport}
      shiftData={shiftData}
      gstData={{
        taxableValue: Math.round(totalTaxableValue * 100) / 100,
        cgst: halfTax,
        sgst: halfTax,
        totalTax: Math.round(totalTax * 100) / 100,
        panCompliantCount,
        panThresholdCount,
      }}
      branches={dbBranches}
    />
  );
}
