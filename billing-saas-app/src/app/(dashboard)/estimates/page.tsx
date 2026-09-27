import type { Metadata } from "next";
import EstimatesClient, { EstimateRecord } from "./EstimatesClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Estimates & Quotations",
  description: "Gold-rate-locked quotations for customers with Section 269ST compliance.",
};

export default async function EstimatesPage() {
  const { tenantId } = await getActiveTenantContext();

  const [dbEstimates, dbProducts, dbCustomers, dbRates] = await Promise.all([
    prisma.estimate.findMany({
      where: { tenantId },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { estimateDate: "desc" },
    }),
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { purity: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.customer.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.goldRate.findMany({
      where: { tenantId },
      include: { purity: true },
      orderBy: { effectiveAt: "desc" },
    }),
  ]);

  const rate22K = Number(dbRates.find((r) => r.purity?.name.includes("22"))?.ratePerGram ?? 6120);

  const initialEstimates: EstimateRecord[] = dbEstimates.map((e) => {
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(e.estimateDate));

    const expStr = e.expiryDate
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(e.expiryDate))
      : "—";

    return {
      id: e.id,
      estimateNumber: e.estimateNumber,
      estimateDate: dateStr,
      expiryDate: expStr,
      customer: e.customer?.name || "Walk-in Customer",
      phone: e.customer?.phone || "—",
      items: e.items.map((i) => ({
        id: i.id,
        name: i.productName,
        weight: Number(i.grossWeight),
        purity: "22K",
        rate: Number(i.goldRatePerGram),
        makingCharge: Number(i.makingCharge),
        amount: Number(i.totalAmount),
        quantity: i.quantity,
      })),
      grossAmount: Number(e.grossAmount),
      discount: Number(e.discountAmount),
      tax: Number(e.taxAmount),
      netAmount: Number(e.netAmount),
      goldRateSnapshot: `22K: ₹${rate22K}/g`,
      status: e.status,
      notes: e.notes || "",
    };
  });

  const availableProducts = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    purity: p.purity?.name || "22K",
    grossWeight: Number(p.grossWeight),
    netWeight: Number(p.netWeight),
    makingChargeValue: Number(p.makingChargeValue),
  }));

  return (
    <EstimatesClient
      initialEstimates={initialEstimates}
      products={availableProducts}
      customers={dbCustomers}
      active22KRate={rate22K}
    />
  );
}
