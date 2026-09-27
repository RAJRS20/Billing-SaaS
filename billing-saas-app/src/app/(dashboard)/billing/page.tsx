import type { Metadata } from "next";
import BillingClient from "./BillingClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "POS Billing",
  description: "Create new jewellery invoices with live gold rate pricing, barcode scanning, and multi-mode payments.",
};

export default async function BillingPage() {
  const { tenantId } = await getActiveTenantContext();

  const [dbProducts, dbRates, dbCustomers, storeSetting] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventory: true,
        purity: true,
        category: true,
        metal: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.goldRate.findMany({
      where: { tenantId },
      include: { purity: true },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        panNumber: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.storeSetting.findFirst({
      where: { tenantId },
    }),
  ]);

  // Determine latest 22K gold rate
  const rate22K = dbRates.find((r) => r.purity?.name.includes("22"))?.ratePerGram ?? 6120;

  const initialProducts = dbProducts.map((p) => {
    const pRate = dbRates.find((r) => r.purityId === p.purityId)?.ratePerGram ?? rate22K;
    return {
      id: p.id,
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category.name,
      metal: p.metal.name,
      purity: p.purity?.name ?? "22K",
      barcode: p.barcode ?? p.sku,
      huid: p.huid ?? "",
      grossWeight: Number(p.grossWeight),
      stoneWeight: Number(p.stoneWeight),
      netWeight: Number(p.netWeight),
      wastageType: p.wastageType,
      wastageValue: Number(p.wastageValue),
      makingChargeType: p.makingChargeType,
      makingChargeValue: Number(p.makingChargeValue),
      stoneChargeFixed: Number(p.stoneChargeFixed),
      goldRate: Number(pRate),
      qty: 1,
      discount: 0,
      stockQty: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
    };
  });

  return (
    <BillingClient
      initialProducts={initialProducts}
      liveRates={dbRates.map((r) => ({
        karat: r.purity?.name.includes("24") ? 24 : r.purity?.name.includes("22") ? 22 : 18,
        ratePerGram: Number(r.ratePerGram),
      }))}
      active22KRate={Number(rate22K)}
      initialCustomers={dbCustomers}
      panThreshold={Number(storeSetting?.cashPanLimit ?? 200000)}
    />
  );
}
