import type { Metadata } from "next";
import ExpensesClient, { ExpenseRecord } from "./ExpensesClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Operating Expenses",
  description: "Track showroom operational expenses with payment modes and double-entry accounting journals.",
};

const DEFAULT_CATEGORIES = [
  "Rent",
  "Salary",
  "Hallmarking",
  "Transport",
  "Utilities",
  "Marketing",
  "Bank Charges",
  "Miscellaneous",
];

export default async function ExpensesPage() {
  const { tenantId } = await getActiveTenantContext();

  // Ensure default categories exist
  let dbCategories = await prisma.expenseCategory.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (dbCategories.length === 0) {
    try {
      await prisma.expenseCategory.createMany({
        data: DEFAULT_CATEGORIES.map((name) => ({ tenantId, name })),
        skipDuplicates: true,
      });
    } catch (catErr) {
      console.warn("Could not auto-seed expense categories:", catErr);
    }

    dbCategories = await prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  const dbExpenses = await prisma.expense.findMany({
    where: { tenantId },
    include: { category: true },
    orderBy: { expenseDate: "desc" },
    take: 100,
  });

  const initialExpenses: ExpenseRecord[] = dbExpenses.map((e) => {
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(e.expenseDate));

    return {
      id: e.id,
      date: dateStr,
      category: e.category.name,
      description: e.description,
      amount: Number(e.amount),
      method: e.method,
      reference: e.reference || "",
    };
  });

  return (
    <ExpensesClient
      initialExpenses={initialExpenses}
      categories={dbCategories}
    />
  );
}
