import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import CustomersClient, { CustomerData } from "./CustomersClient";

export const metadata: Metadata = {
  title: "Customers & CRM | JewelBill SaaS",
  description:
    "Comprehensive jewellery CRM — track purchase histories, KYC records, advance deposits, and customer receivables.",
};

export default async function CustomersPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialCustomers: CustomerData[] = [];

  if (tenantId) {
    const dbCustomers = await prisma.customer.findMany({
      where: { tenantId },
      include: {
        sales: {
          select: {
            id: true,
            invoiceNumber: true,
            netAmount: true,
            amountPaid: true,
            amountDue: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            estimatedAmount: true,
            advancePaid: true,
            balanceDue: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        advances: {
          select: {
            id: true,
            amount: true,
            method: true,
            isAdjusted: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    initialCustomers = dbCustomers.map((c) => {
      const totalPurchases = c.sales.length;
      const totalPaid =
        c.sales.reduce((sum, s) => sum + Number(s.amountPaid), 0) +
        c.advances.reduce((sum, a) => sum + Number(a.amount), 0);
      const outstanding =
        c.sales.reduce((sum, s) => sum + Number(s.amountDue), 0) +
        c.orders.reduce((sum, o) => sum + Number(o.balanceDue), 0);
      const advanceBalance = c.advances
        .filter((a) => !a.isAdjusted)
        .reduce((sum, a) => sum + Number(a.amount), 0);
      const lifetimeValue = c.sales.reduce((sum, s) => sum + Number(s.netAmount), 0);

      // Latest interaction
      const allDates = [
        ...c.sales.map((s) => s.createdAt.getTime()),
        ...c.orders.map((o) => o.createdAt.getTime()),
        c.createdAt.getTime(),
      ];
      const lastVisit = format(new Date(Math.max(...allDates)), "dd MMM yyyy");

      // Combined transactions
      const txns = [
        ...c.sales.map((s) => ({
          date: format(s.createdAt, "dd MMM"),
          type: "SALE",
          ref: s.invoiceNumber,
          amount: Number(s.netAmount),
          balance: Number(s.amountDue),
        })),
        ...c.advances.map((a) => ({
          date: format(a.createdAt, "dd MMM"),
          type: "ADVANCE",
          ref: `ADV-${a.id.slice(-6).toUpperCase()}`,
          amount: Number(a.amount),
          balance: 0,
        })),
      ].sort((a, b) => b.ref.localeCompare(a.ref));

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email ?? "",
        city: c.city ?? "Chennai",
        gstin: c.gstin ?? "",
        panNumber: c.panNumber ?? "",
        dob: c.dob ? format(c.dob, "dd MMM yyyy") : "",
        anniversary: c.anniversary ? format(c.anniversary, "dd MMM yyyy") : "",
        totalPurchases,
        totalPaid,
        outstanding,
        advanceBalance,
        lifetimeValue,
        lastVisit,
        oldGoldValue: 0,
        ordersActive: c.orders.filter((o) => o.status === "IN_PROGRESS" || o.status === "PENDING").length,
        repairsActive: 0,
        isActive: c.isActive,
        transactions: txns,
      };
    });
  }

  return <CustomersClient initialCustomers={initialCustomers} />;
}
