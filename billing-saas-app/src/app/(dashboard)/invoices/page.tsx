import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import InvoicesClient, { InvoiceRecord } from "./InvoicesClient";

export const metadata: Metadata = {
  title: "Invoices & Billing History | JewelBill SaaS",
  description:
    "View, search, and print GST compliant jewellery tax invoices, payments, and receipt vouchers.",
};

export default async function InvoicesPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialInvoices: InvoiceRecord[] = [];

  if (tenantId) {
    const dbSales = await prisma.sale.findMany({
      where: { tenantId },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    initialInvoices = dbSales.map((s) => {
      const itemsSummary = s.items.map((i) => i.productName).join(", ");
      const paymentMethod = s.payments[0]?.method || "UPI";

      return {
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        date: format(s.createdAt, "dd MMM yyyy, hh:mm a"),
        customer: s.customer?.name || "Walk-in Customer",
        phone: s.customer?.phone || "—",
        itemsSummary: itemsSummary || "Jewellery Items",
        grossAmount: Number(s.grossAmount),
        tax: Number(s.totalTaxAmount),
        netAmount: Number(s.netAmount),
        amountPaid: Number(s.amountPaid),
        amountDue: Number(s.amountDue),
        paymentMethod: paymentMethod.replace(/_/g, " "),
        status: Number(s.amountDue) === 0 ? "PAID" : Number(s.amountPaid) > 0 ? "PARTIAL" : "PENDING",
        items: s.items.map((i) => ({
          productName: i.productName,
          sku: i.barcode || "SKU",
          huid: i.huid ?? undefined,
          grossWeight: Number(i.grossWeight),
          netWeight: Number(i.netWeight),
          makingCharge: Number(i.makingCharge),
          itemNetAmount: Number(i.itemNetAmount),
        })),
      };
    });
  }

  return <InvoicesClient initialInvoices={initialInvoices} />;
}
