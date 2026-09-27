import type { Metadata } from "next";
import ProductsClient, { ProductItem } from "./ProductsClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Products Catalog",
  description: "Jewellery product inventory with 6-digit HUID tracking, barcode printing and stock weights.",
};

export default async function ProductsPage() {
  const { tenantId } = await getActiveTenantContext();

  const [dbProducts, dbCategories, dbPurities, dbMetals, dbRates] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: true,
        purity: true,
        metal: true,
        inventory: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.purity.findMany({
      where: { tenantId },
      select: { id: true, name: true, fineness: true },
      orderBy: { fineness: "desc" },
    }),
    prisma.metal.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.goldRate.findMany({
      where: { tenantId },
      include: { purity: true },
      orderBy: { effectiveAt: "desc" },
    }),
  ]);

  const rate22K = Number(dbRates.find((r) => r.purity?.name.includes("22"))?.ratePerGram ?? 6120);

  const initialProducts: ProductItem[] = dbProducts.map((p) => {
    const qty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const itemRate = dbRates.find((r) => r.purityId === p.purityId)?.ratePerGram ?? rate22K;
    const netWeight = Number(p.netWeight);
    const makingRate = Number(p.makingChargeValue);
    const approx = Math.round(netWeight * Number(itemRate) + netWeight * makingRate + Number(p.stoneChargeFixed));

    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode ?? p.sku,
      name: p.name,
      category: p.category.name,
      purity: p.purity?.name ?? "22K",
      metal: p.metal.name,
      huid: p.huid ?? "",
      grossWeight: Number(p.grossWeight),
      stoneWeight: Number(p.stoneWeight),
      netWeight,
      makingChargeType: p.makingChargeType as any,
      makingChargeRate: makingRate,
      wastagePct: Number(p.wastageValue),
      stockQty: qty,
      approxPrice: approx,
      status: qty > 2 ? "IN_STOCK" : qty > 0 ? "LOW_STOCK" : "OUT_OF_STOCK",
    };
  });

  return (
    <ProductsClient
      initialProducts={initialProducts}
      categories={dbCategories}
      purities={dbPurities.map((p) => ({ id: p.id, name: p.name, fineness: Number(p.fineness) }))}
      metals={dbMetals}
      active22KRate={rate22K}
    />
  );
}
