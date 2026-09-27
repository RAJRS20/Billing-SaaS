import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import OldGoldClient, { OldGoldRecord, CustomerOption } from "./OldGoldClient";

export const metadata: Metadata = {
  title: "Old Gold Operations & Assaying | JewelBill SaaS",
  description:
    "Record scrap gold appraisals, purity testing, melting deductions, exchange credits, and cash purchases.",
};

export default async function OldGoldPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialRecords: OldGoldRecord[] = [];
  let customers: CustomerOption[] = [];
  let currentBuyingRate24K = 6120;

  if (tenantId) {
    const [dbRecords, dbCustomers, latestRate] = await Promise.all([
      prisma.oldGoldTransaction.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      }),
      prisma.goldRate.findFirst({
        where: { tenantId },
        orderBy: { effectiveAt: "desc" },
      }),
    ]);

    customers = dbCustomers;
    const customerMap = new Map(dbCustomers.map((c) => [c.id, c]));

    if (latestRate) {
      currentBuyingRate24K = Number(latestRate.ratePerGram);
    }

    initialRecords = dbRecords.map((r) => {
      const c = r.customerId ? customerMap.get(r.customerId) : undefined;
      const notes = r.notes || "";
      const custMatch = notes.match(/Customer:\s*([^·(]+)/);
      const phoneMatch = notes.match(/\(([^)]+)\)/);

      return {
        id: r.id,
        date: format(r.createdAt, "dd MMM yyyy"),
        type: r.type,
        customerId: r.customerId ?? undefined,
        customer: c?.name || (custMatch ? custMatch[1].trim() : "Walk-in Customer"),
        phone: c?.phone || (phoneMatch ? phoneMatch[1].trim() : "—"),
        purity: r.purityName,
        testedFineness: Number(r.testedFineness),
        grossWeight: Number(r.grossWeight),
        deductions: Number(r.stoneWeight),
        netWeight: Number(r.netWeight),
        pureGoldEquiv: Number(r.pureGoldEquivalent),
        buyingRate: Number(r.buyingRate24K),
        valuationAmount: Number(r.valuationAmount),
        linkedInvoice: r.saleId ? `INV-${r.saleId.slice(-6)}` : "",
        status: r.status as any,
        approvedBy: "Manager",
        notes: r.notes ?? "",
      };
    });
  }

  return (
    <OldGoldClient
      initialRecords={initialRecords}
      customers={customers}
      currentBuyingRate24K={currentBuyingRate24K}
    />
  );
}
