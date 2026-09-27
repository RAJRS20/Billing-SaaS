import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import PurchasesClient, {
  PurchaseData,
  SupplierOption,
  ProductOption,
} from "./PurchasesClient";

export const metadata: Metadata = {
  title: "Purchases & Inwarding | JewelBill SaaS",
  description:
    "Manage bullion & jewellery supplier purchase orders, stock inwarding, payable balances, and settlements.",
};

export default async function PurchasesPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialPurchases: PurchaseData[] = [];
  let suppliers: SupplierOption[] = [];
  let products: ProductOption[] = [];

  if (tenantId) {
    const [dbPurchases, dbSuppliers, dbProducts] = await Promise.all([
      prisma.purchase.findMany({
        where: { tenantId },
        include: {
          supplier: true,
          branch: true,
          items: {
            include: {
              product: {
                include: { purity: true },
              },
            },
          },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: { purity: true },
        orderBy: { name: "asc" },
      }),
    ]);

    suppliers = dbSuppliers;

    products = dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      grossWeight: Number(p.grossWeight),
      netWeight: Number(p.netWeight),
      purity: p.purity?.name ?? "22K",
    }));

    initialPurchases = dbPurchases.map((p) => ({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      purchaseDate: format(p.purchaseDate, "dd MMM yyyy"),
      supplierId: p.supplierId,
      supplier: p.supplier.name,
      supplierPhone: p.supplier.phone,
      branch: p.branch.name,
      items: p.items.map((i) => ({
        name: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        grossWeight: Number(i.grossWeight),
        netWeight: Number(i.netWeight),
        ratePerGram: Number(i.ratePerGram),
        totalCost: Number(i.totalCost),
        purity: i.product.purity?.name ?? "22K",
      })),
      grossAmount: Number(p.grossAmount),
      taxAmount: Number(p.taxAmount),
      netAmount: Number(p.netAmount),
      amountPaid: Number(p.amountPaid),
      amountDue: Number(p.amountDue),
      status: p.status as any,
      notes: p.notes ?? "",
    }));
  }

  return (
    <PurchasesClient
      initialPurchases={initialPurchases}
      suppliers={suppliers}
      products={products}
    />
  );
}
