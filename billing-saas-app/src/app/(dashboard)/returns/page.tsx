import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import ReturnsClient, { ReturnRecord } from "./ReturnsClient";

export const metadata: Metadata = {
  title: "Returns & Exchanges | JewelBill SaaS",
  description:
    "Process sales returns, verify original invoices, issue credit notes, and restore inventory stock balances.",
};

export default async function ReturnsPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialReturns: ReturnRecord[] = [];

  if (tenantId) {
    const dbReturns = await prisma.saleReturn.findMany({
      where: { tenantId },
      include: {
        sale: {
          include: { customer: true },
        },
        items: {
          include: {
            saleItem: {
              include: {
                product: {
                  include: { purity: true },
                },
              },
            },
          },
        },
      },
      orderBy: { returnDate: "desc" },
    });

    initialReturns = dbReturns.map((r) => {
      const firstItem = r.items[0]?.saleItem;
      const product = firstItem?.product;

      return {
        id: r.id,
        returnNumber: `RET-${r.id.slice(-6).toUpperCase()}`,
        date: format(r.returnDate, "dd MMM yyyy"),
        type: "RETURN",
        originalInvoice: r.sale.invoiceNumber,
        customer: r.sale.customer?.name || "Walk-in Customer",
        phone: r.sale.customer?.phone || "—",
        returnedItem: product?.name || "Jewellery Article",
        returnedSku: product?.sku || "SKU",
        returnedWeight: product ? Number(product.grossWeight) : 0,
        returnedPurity: product?.purity?.name ?? "22K",
        refundAmount: Number(r.refundAmount),
        refundMethod: r.refundMethod || "CREDIT_NOTE",
        newItem: "",
        newItemValue: 0,
        differenceAmount: -Number(r.refundAmount),
        inspectionNotes: r.reason || "Returned in good condition",
        approvedBy: "Manager",
        status: "COMPLETED",
      };
    });
  }

  return <ReturnsClient initialReturns={initialReturns} />;
}
