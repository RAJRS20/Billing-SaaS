import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import InventoryClient, { InventoryItem, StockMovement, StockAdjustmentRecord } from "./InventoryClient";

export const metadata: Metadata = {
  title: "Inventory & Stock | JewelBill SaaS",
  description:
    "Complete jewellery stock ledger — view live inventory, track movements, manage adjustments, and reconcile gold weight by purity and branch.",
};

export default async function InventoryPage() {
  const { tenantId } = await getActiveTenantContext();

  let items: InventoryItem[] = [];
  let movements: StockMovement[] = [];
  let adjustments: StockAdjustmentRecord[] = [];
  let branches: { id: string; name: string }[] = [];

  if (tenantId) {
    const [dbProducts, dbMovements, dbAdjustments, dbBranches] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: {
          inventory: true,
          category: true,
          metal: true,
          purity: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryTransaction.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.stockAdjustment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    branches = dbBranches;

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const branchMap = new Map(dbBranches.map((b) => [b.id, b.name]));

    items = dbProducts.map((p) => {
      const qty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const gross = Number(p.grossWeight);
      const net = Number(p.netWeight);
      const stone = Number(p.stoneWeight);
      const making = Number(p.makingChargeValue);

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        barcode: p.barcode ?? p.sku,
        huid: p.huid ?? "",
        category: p.category.name,
        metal: p.metal.name,
        purity: p.purity?.name ?? "22K",
        fineness: Number(p.purity?.fineness ?? 0.9166),
        grossWeight: gross,
        stoneWeight: stone,
        netWeight: net,
        quantity: qty,
        status: qty > 0 ? "IN_STOCK" : "SOLD",
        branch: branches[0]?.name ?? "Main Branch",
        purchaseCost: Math.round(net * 5800),
        currentValue: Math.round(net * 6120 + making * net),
        lastMovement: "Live Sync",
      };
    });

    movements = dbMovements.map((m) => {
      const p = productMap.get(m.productId);
      return {
        id: m.id,
        date: format(m.createdAt, "dd MMM yyyy"),
        time: format(m.createdAt, "HH:mm"),
        type: m.type as any,
        sku: p?.sku ?? "SKU-N/A",
        productName: p?.name ?? "Jewellery Item",
        quantityChange: m.quantityChange,
        weightChange: Number(m.grossWeightChange),
        reference: m.referenceId ?? `TXN-${m.id.slice(-6)}`,
        referenceType: m.referenceType ?? "MOVEMENT",
        notes: m.notes ?? m.reason ?? "",
        user: "System",
        branch: branchMap.get(m.branchId) ?? "Main Branch",
      };
    });

    adjustments = dbAdjustments.map((a) => {
      const p = productMap.get(a.productId);
      return {
        id: a.id,
        date: format(a.createdAt, "dd MMM yyyy"),
        sku: p?.sku ?? "SKU-N/A",
        productName: p?.name ?? "Jewellery Item",
        reason: a.reason,
        qtyBefore: a.quantityBefore,
        qtyAfter: a.quantityAfter,
        change: a.quantityAfter - a.quantityBefore,
        notes: a.notes ?? "",
        approvedBy: "Manager",
        status: "APPROVED" as const,
      };
    });
  }

  return (
    <InventoryClient
      initialItems={items.length > 0 ? items : undefined}
      initialMovements={movements.length > 0 ? movements : undefined}
      initialAdjustments={adjustments.length > 0 ? adjustments : undefined}
      branches={branches}
    />
  );
}
