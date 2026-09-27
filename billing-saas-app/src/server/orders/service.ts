import { Prisma, OrderStatus, PaymentMethod } from "@prisma/client";
import prisma from "../../lib/prisma.ts";
import { postJournalEntry } from "../accounting/journal.ts";

export interface CreateOrderInput {
  tenantId: string;
  customerId: string;
  orderNumber?: string;
  expectedDate?: Date;
  description: string;
  estimatedAmount: number;
  initialAdvanceAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  notes?: string;
}

/**
 * Create a bespoke Custom Jewellery Order.
 * Optionally records the initial advance receipt with customer ledger credit.
 */
export async function createOrder(input: CreateOrderInput) {
  const {
    tenantId,
    customerId,
    expectedDate,
    description,
    estimatedAmount,
    initialAdvanceAmount = 0,
    paymentMethod = PaymentMethod.UPI,
    paymentReference,
    notes,
  } = input;

  return await prisma.$transaction(async (tx) => {
    const orderNumber =
      input.orderNumber ??
      `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const balanceDue = Math.max(0, estimatedAmount - initialAdvanceAmount);

    const order = await tx.order.create({
      data: {
        tenantId,
        customerId,
        orderNumber,
        orderDate: new Date(),
        expectedDate,
        description,
        estimatedAmount,
        advancePaid: initialAdvanceAmount,
        balanceDue,
        status: OrderStatus.PENDING,
        notes,
      },
    });

    // If initial advance paid, record advance receipt
    if (initialAdvanceAmount > 0) {
      await recordAdvanceReceipt(
        {
          tenantId,
          customerId,
          orderId: order.id,
          amount: initialAdvanceAmount,
          method: paymentMethod,
          reference: paymentReference,
          notes: `Advance for Order ${orderNumber}`,
        },
        tx
      );
    }

    return order;
  });
}

export interface RecordAdvanceReceiptInput {
  tenantId: string;
  customerId: string;
  orderId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

/**
 * Record an auditable customer advance deposit receipt.
 * Updates order advance balance and creates double-entry journal liability entry.
 */
export async function recordAdvanceReceipt(
  input: RecordAdvanceReceiptInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const { tenantId, customerId, orderId, amount, method, reference, notes } = input;

  if (amount <= 0) {
    throw new Error("ADVANCE_ERROR: Advance deposit amount must be greater than zero.");
  }

  // 1. Create Advance record
  const advance = await db.advance.create({
    data: {
      tenantId,
      customerId,
      orderId,
      amount,
      method,
      reference,
      notes,
      isAdjusted: false,
    },
  });

  // 2. If linked to an order, update order totals
  if (orderId) {
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (order) {
      const newAdvancePaid = Number(order.advancePaid) + amount;
      const newBalanceDue = Math.max(0, Number(order.estimatedAmount) - newAdvancePaid);

      await db.order.update({
        where: { id: orderId },
        data: {
          advancePaid: newAdvancePaid,
          balanceDue: newBalanceDue,
        },
      });
    }
  }

  // 3. Post Double-Entry Journal (Cash/Bank Asset DEBIT, Customer Advance Liability CREDIT)
  const accounts = await db.account.findMany({ where: { tenantId } });
  const assetAcc =
    method === PaymentMethod.CASH
      ? accounts.find((a) => a.code === "1010")
      : accounts.find((a) => a.code === "1020" || a.code === "1025");
  const advanceLiabilityAcc = accounts.find((a) => a.code === "2020");

  if (assetAcc && advanceLiabilityAcc) {
    await postJournalEntry(
      {
        tenantId,
        description: `Customer Advance Receipt ${advance.id}`,
        referenceId: advance.id,
        referenceType: "ADVANCE",
        lines: [
          { accountId: assetAcc.id, debit: amount, credit: 0 },
          { accountId: advanceLiabilityAcc.id, debit: 0, credit: amount },
        ],
      },
      tx
    );
  }

  return advance;
}

/**
 * Transition order lifecycle state (PENDING -> IN_PROGRESS -> READY -> DELIVERED -> CANCELLED).
 */
export async function transitionOrderStatus(
  tenantId: string,
  orderId: string,
  newStatus: OrderStatus
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.tenantId !== tenantId) {
    throw new Error("ORDER_NOT_FOUND: Order not found or unauthorized tenant.");
  }

  // State machine validation
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
    [OrderStatus.IN_PROGRESS]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  const allowed = validTransitions[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `INVALID_STATE_TRANSITION: Cannot transition order from ${order.status} to ${newStatus}.`
    );
  }

  return await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });
}
