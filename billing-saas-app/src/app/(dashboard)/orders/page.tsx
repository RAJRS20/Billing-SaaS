import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import OrdersClient, {
  OrderRecord,
  AdvanceRecord,
  CustomerOption,
} from "./OrdersClient";

export const metadata: Metadata = {
  title: "Custom Orders & Advances | JewelBill SaaS",
  description:
    "Manage bespoke jewellery customer orders, multi-step advance receipts, karigar job tickets, and delivery schedules.",
};

export default async function OrdersPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialOrders: OrderRecord[] = [];
  let initialAdvances: AdvanceRecord[] = [];
  let customers: CustomerOption[] = [];

  if (tenantId) {
    const [dbOrders, dbAdvances, dbCustomers] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId },
        include: {
          customer: true,
          advances: true,
        },
        orderBy: { orderDate: "desc" },
      }),
      prisma.advance.findMany({
        where: { tenantId },
        include: {
          customer: true,
          order: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      }),
    ]);

    customers = dbCustomers;

    initialOrders = dbOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: format(o.orderDate, "dd MMM yyyy"),
      expectedDate: o.expectedDate ? format(o.expectedDate, "dd MMM yyyy") : "",
      customerId: o.customerId,
      customer: o.customer.name,
      phone: o.customer.phone,
      description: o.description,
      estimatedAmount: Number(o.estimatedAmount),
      advancePaid: Number(o.advancePaid),
      balanceDue: Number(o.balanceDue),
      status: o.status as any,
      notes: o.notes ?? "",
    }));

    initialAdvances = dbAdvances.map((a) => ({
      id: a.id,
      date: format(a.createdAt, "dd MMM yyyy"),
      customerId: a.customerId,
      customer: a.customer.name,
      phone: a.customer.phone,
      orderNumber: a.order?.orderNumber || "Direct Advance",
      orderId: a.orderId ?? undefined,
      amount: Number(a.amount),
      method: a.method,
      reference: a.reference ?? "",
      isAdjusted: a.isAdjusted,
      notes: a.notes ?? "",
    }));
  }

  return (
    <OrdersClient
      initialOrders={initialOrders}
      initialAdvances={initialAdvances}
      customers={customers}
    />
  );
}
