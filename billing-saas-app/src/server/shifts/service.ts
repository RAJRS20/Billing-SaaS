import prisma from "../../lib/prisma.ts";

export interface OpenShiftInput {
  tenantId: string;
  branchId: string;
  userId: string;
  openingCash: number;
}

/**
 * Open a cashier POS shift with initial cash drawer float.
 */
export async function openShift(input: OpenShiftInput) {
  const { tenantId, branchId, userId, openingCash } = input;

  // Get active shift count for sequence
  const shiftCount = await prisma.shift.count({
    where: { tenantId, branchId },
  });

  return await prisma.shift.create({
    data: {
      tenantId,
      branchId,
      userId,
      shiftNumber: shiftCount + 1,
      openingCash,
      openedAt: new Date(),
      isLocked: false,
    },
  });
}

export interface CloseShiftInput {
  tenantId: string;
  shiftId: string;
  actualCash: number;
  approvedById?: string;
  notes?: string;
}

/**
 * Close and reconcile cashier shift drawer cash against system expectations.
 * Computes: Expected Cash = Opening Float + Cash Sales - Cash Old Gold Outflow - Cash Expenses
 */
export async function closeAndReconcileShift(input: CloseShiftInput) {
  const { tenantId, shiftId, actualCash, approvedById, notes } = input;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift || shift.tenantId !== tenantId) {
    throw new Error("SHIFT_NOT_FOUND: Shift not found or unauthorized tenant.");
  }

  // Calculate cash sales during this shift window
  const shiftStart = shift.openedAt;
  const shiftEnd = new Date();

  const cashSales = await prisma.salePayment.aggregate({
    _sum: { amount: true },
    where: {
      method: "CASH",
      sale: {
        tenantId,
        branchId: shift.branchId,
        invoiceDate: { gte: shiftStart, lte: shiftEnd },
      },
    },
  });

  // Calculate cash paid out for old gold outright purchases
  const cashOldGold = await prisma.oldGoldTransaction.aggregate({
    _sum: { valuationAmount: true },
    where: {
      tenantId,
      branchId: shift.branchId,
      type: "CASH_PURCHASE",
      createdAt: { gte: shiftStart, lte: shiftEnd },
    },
  });

  // Calculate cash expenses
  const cashExpenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      tenantId,
      method: "CASH",
      expenseDate: { gte: shiftStart, lte: shiftEnd },
    },
  });

  const opening = Number(shift.openingCash);
  const salesInflow = Number(cashSales._sum.amount ?? 0);
  const oldGoldOutflow = Number(cashOldGold._sum.valuationAmount ?? 0);
  const expenseOutflow = Number(cashExpenses._sum.amount ?? 0);

  const expectedCash = Math.round((opening + salesInflow - oldGoldOutflow - expenseOutflow) * 100) / 100;
  const cashVariance = Math.round((actualCash - expectedCash) * 100) / 100;

  // Lock shift
  const closedShift = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      closedAt: shiftEnd,
      expectedCash,
      actualCash,
      cashVariance,
      isLocked: true,
      approvedById,
      notes,
    },
  });

  return {
    closedShift,
    expectedCash,
    actualCash,
    cashVariance,
    breakdown: {
      opening,
      salesInflow,
      oldGoldOutflow,
      expenseOutflow,
    },
  };
}
