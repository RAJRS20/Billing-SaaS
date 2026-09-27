import { Prisma, PaymentMethod } from "@prisma/client";
import prisma from "../../lib/prisma.ts";
import { postJournalEntry } from "../accounting/journal.ts";

export interface RecordExpenseInput {
  tenantId: string;
  categoryId: string;
  amount: number;
  method: PaymentMethod;
  description: string;
  reference?: string;
  expenseDate?: Date;
}

/**
 * Record an operating showroom expense (Rent, Salary, Hallmarking, Transport, Utilities, etc.)
 * with payment mode tracking and balanced accounting journal entries.
 */
export async function recordExpense(input: RecordExpenseInput) {
  const { tenantId, categoryId, amount, method, description, reference, expenseDate } = input;

  if (amount <= 0) {
    throw new Error("EXPENSE_ERROR: Expense amount must be greater than zero.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create Expense record
    const expense = await tx.expense.create({
      data: {
        tenantId,
        categoryId,
        amount,
        method,
        description,
        reference,
        expenseDate: expenseDate ?? new Date(),
      },
    });

    // 2. Post Accounting Journal Entry (Expense DEBIT, Cash/Bank CREDIT)
    const accounts = await tx.account.findMany({ where: { tenantId } });
    const expenseAcc = accounts.find((a) => a.code === "5020") || accounts.find((a) => a.type === "EXPENSE");
    const assetAcc =
      method === PaymentMethod.CASH
        ? accounts.find((a) => a.code === "1010")
        : accounts.find((a) => a.code === "1020" || a.code === "1025");

    if (expenseAcc && assetAcc) {
      await postJournalEntry(
        {
          tenantId,
          description: `Operating Expense: ${description}`,
          referenceId: expense.id,
          referenceType: "EXPENSE",
          lines: [
            { accountId: expenseAcc.id, debit: amount, credit: 0 },
            { accountId: assetAcc.id, debit: 0, credit: amount },
          ],
        },
        tx
      );
    }

    return expense;
  });
}
