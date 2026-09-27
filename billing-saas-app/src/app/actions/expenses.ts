"use server";

import { getActiveTenantContext } from "@/lib/auth";
import { recordExpense } from "@/server/expenses/service";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CreateExpenseActionInput {
  categoryId: string;
  amount: number;
  method: PaymentMethod;
  description: string;
  reference?: string;
}

export async function createExpenseAction(input: CreateExpenseActionInput) {
  try {
    const { tenantId } = await getActiveTenantContext();

    if (!input.description || input.description.trim() === "") {
      throw new Error("Expense description is required.");
    }
    if (input.amount <= 0) {
      throw new Error("Expense amount must be greater than zero.");
    }

    const expense = await recordExpense({
      tenantId,
      categoryId: input.categoryId,
      amount: input.amount,
      method: input.method,
      description: input.description.trim(),
      reference: input.reference,
    });

    revalidatePath("/expenses");
    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return { success: true, expense };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record expense." };
  }
}
