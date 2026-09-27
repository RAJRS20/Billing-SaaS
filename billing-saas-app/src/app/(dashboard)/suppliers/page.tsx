import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";
import { format } from "date-fns";
import SuppliersClient, { SupplierData } from "./SuppliersClient";

export const metadata: Metadata = {
  title: "Suppliers & Bullion Vendors | JewelBill SaaS",
  description:
    "Manage bullion dealers, jewellery manufacturers, gemstone suppliers, and outstanding accounts payable.",
};

export default async function SuppliersPage() {
  const { tenantId } = await getActiveTenantContext();

  let initialSuppliers: SupplierData[] = [];

  if (tenantId) {
    const dbSuppliers = await prisma.supplier.findMany({
      where: { tenantId },
      include: {
        purchases: {
          select: {
            netAmount: true,
            amountPaid: true,
            amountDue: true,
            purchaseDate: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    initialSuppliers = dbSuppliers.map((s) => {
      const totalPurchases = s.purchases.reduce((sum, p) => sum + Number(p.netAmount), 0);
      const totalPaid = s.purchases.reduce((sum, p) => sum + Number(p.amountPaid), 0);
      const totalDue = s.purchases.reduce((sum, p) => sum + Number(p.amountDue), 0);

      // Latest purchase date
      const latestDate = s.purchases.length > 0
        ? format(
            new Date(Math.max(...s.purchases.map((p) => p.purchaseDate.getTime()))),
            "dd MMM yyyy"
          )
        : "Never";

      // Parse metadata from notes if present
      const notes = s.notes || "";
      const contactMatch = notes.match(/Contact:\s*([^·]+)/);
      const categoryMatch = notes.match(/Category:\s*([^·]+)/);
      const termsMatch = notes.match(/Terms:\s*(\d+)d/);

      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email ?? "",
        address: s.address ?? "",
        city: "Chennai",
        gstin: s.gstin ?? "",
        panNumber: s.panNumber ?? "",
        contactPerson: contactMatch ? contactMatch[1].trim() : "Accounts Manager",
        creditTermDays: termsMatch ? parseInt(termsMatch[1], 10) : 30,
        totalPurchases,
        totalPaid,
        totalDue,
        lastPurchaseDate: latestDate,
        isActive: s.isActive,
        category: categoryMatch ? categoryMatch[1].trim() : "Gold",
      };
    });
  }

  return <SuppliersClient initialSuppliers={initialSuppliers} />;
}
