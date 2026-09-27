import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Live overview of jewellery showroom — sales, gold rates, stock valuation and dues.",
};

export default async function DashboardPage() {
  const { session, tenantId } = await getActiveTenantContext();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    tenant,
    todaySales,
    monthSales,
    monthAdvances,
    customers,
    products,
    dbRates,
    pastWeekSales,
    pastWeekPurchases,
    recentSales,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { branches: true },
    }),
    prisma.sale.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        items: true,
      },
    }),
    prisma.sale.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: monthStart },
      },
      select: {
        id: true,
        netAmount: true,
      },
    }),
    prisma.advance.aggregate({
      where: {
        tenantId,
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.customer.findMany({
      where: { tenantId, isActive: true },
      include: {
        sales: {
          select: { amountDue: true },
        },
        orders: {
          select: { balanceDue: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { inventory: true, purity: true },
    }),
    prisma.goldRate.findMany({
      where: { tenantId },
      include: { purity: true },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.sale.findMany({
      where: { tenantId, invoiceDate: { gte: sevenDaysAgo } },
      select: { invoiceDate: true, netAmount: true },
    }),
    prisma.purchase.findMany({
      where: { tenantId, purchaseDate: { gte: sevenDaysAgo } },
      select: { purchaseDate: true, netAmount: true },
    }),
    prisma.sale.findMany({
      where: { tenantId },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
      orderBy: { invoiceDate: "desc" },
      take: 5,
    }),
  ]);

  // Rates
  const rate22K = Number(dbRates.find((r) => r.purity?.name.includes("22"))?.ratePerGram ?? 6120);
  const rate24K = Number(dbRates.find((r) => r.purity?.name.includes("24"))?.ratePerGram ?? 6672);
  const rate18K = Number(dbRates.find((r) => r.purity?.name.includes("18"))?.ratePerGram ?? 5004);

  // Today's Sales KPI
  const todayTotalSales = todaySales.reduce((sum, s) => sum + Number(s.netAmount), 0);
  const todayInvoicesCount = todaySales.length;
  const todayGoldGrams = todaySales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, item) => iSum + Number(item.grossWeight), 0),
    0
  );

  // Outstanding dues
  const totalOutstanding = customers.reduce(
    (sum, c) =>
      sum +
      c.sales.reduce((sSum, s) => sSum + Number(s.amountDue), 0) +
      c.orders.reduce((oSum, o) => oSum + Number(o.balanceDue), 0),
    0
  );
  const customersWithDues = customers.filter(
    (c) =>
      c.sales.reduce((sSum, s) => sSum + Number(s.amountDue), 0) +
      c.orders.reduce((oSum, o) => oSum + Number(o.balanceDue), 0) >
      0
  ).length;

  // Stock value and inventory count
  let totalStockValue = 0;
  let totalStockPieces = 0;
  for (const p of products) {
    const qty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    totalStockPieces += qty;
    const itemRate = dbRates.find((r) => r.purityId === p.purityId)?.ratePerGram ?? rate22K;
    const itemValuation = Number(p.netWeight) * Number(itemRate) + Number(p.stoneChargeFixed);
    totalStockValue += itemValuation * qty;
  }

  // Low stock alerts (items with total quantity <= 2)
  const lowStockAlerts = products
    .map((p) => ({
      product: p.name,
      sku: p.sku,
      qty: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
    }))
    .filter((item) => item.qty <= 2)
    .slice(0, 5);

  // Weekly sales vs purchases chart data (grouped by weekday)
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyDataMap = new Map<string, { sales: number; purchases: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    weeklyDataMap.set(dayName, { sales: 0, purchases: 0 });
  }

  for (const s of pastWeekSales) {
    const dayName = daysOfWeek[new Date(s.invoiceDate).getDay()];
    if (weeklyDataMap.has(dayName)) {
      weeklyDataMap.get(dayName)!.sales += Number(s.netAmount);
    }
  }

  for (const p of pastWeekPurchases) {
    const dayName = daysOfWeek[new Date(p.purchaseDate).getDay()];
    if (weeklyDataMap.has(dayName)) {
      weeklyDataMap.get(dayName)!.purchases += Number(p.netAmount);
    }
  }

  const weeklyChartData = Array.from(weeklyDataMap.entries()).map(([day, val]) => ({
    day,
    sales: Math.round(val.sales),
    purchases: Math.round(val.purchases),
  }));

  // Monthly snapshot
  const totalCustomersCount = customers.length;
  const invoicesThisMonth = monthSales.length;
  const totalMonthSalesAmount = monthSales.reduce((sum, s) => sum + Number(s.netAmount), 0);
  const avgInvoiceValue = invoicesThisMonth > 0 ? Math.round(totalMonthSalesAmount / invoicesThisMonth) : 0;
  const advanceCollected = Number(monthAdvances._sum.amount ?? 0);

  // Recent transactions list
  const formattedRecentTransactions = recentSales.map((s) => {
    const timeStr = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(s.invoiceDate));

    return {
      id: s.invoiceNumber,
      customer: s.customer?.name ?? "Walk-in Customer",
      items: s.items.map((i) => i.productName).join(" + ") || "Jewellery Items",
      amount: Number(s.netAmount),
      status: s.status,
      time: timeStr,
      payment: s.payments[0]?.method ?? "CASH",
    };
  });

  return (
    <DashboardClient
      userName={session.name || "Owner"}
      storeName={tenant?.name || "Sri Lakshmi Jewellers"}
      branchName={tenant?.branches[0]?.name || "Main Showroom"}
      kpis={{
        todaySales: todayTotalSales,
        todayInvoices: todayInvoicesCount,
        todayGoldGrams: Math.round(todayGoldGrams * 1000) / 1000,
        outstandingDues: totalOutstanding,
        customersWithDues,
        stockValue: totalStockValue,
        stockPieces: totalStockPieces,
      }}
      weeklyData={weeklyChartData}
      rates={{
        rate24K,
        rate22K,
        rate18K,
      }}
      recentTransactions={formattedRecentTransactions}
      monthlySnapshot={{
        totalCustomers: totalCustomersCount,
        invoicesThisMonth,
        avgInvoiceValue,
        advanceCollected,
      }}
      lowStockAlerts={lowStockAlerts}
    />
  );
}
