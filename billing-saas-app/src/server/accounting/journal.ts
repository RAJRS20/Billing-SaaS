import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.ts";

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
}

export interface PostJournalEntryInput {
  tenantId: string;
  entryNumber?: string;
  date?: Date;
  description: string;
  referenceId?: string;
  referenceType?: "SALE" | "PURCHASE" | "EXPENSE" | "OLD_GOLD" | "ADVANCE" | "REFUND" | "ADJUSTMENT";
  lines: JournalLineInput[];
}

/**
 * Post an auditable double-entry journal transaction.
 * Strictly enforces TOTAL DEBIT === TOTAL CREDIT.
 */
export async function postJournalEntry(
  input: PostJournalEntryInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const { tenantId, description, referenceId, referenceType, lines } = input;

  if (!lines || lines.length < 2) {
    throw new Error("INVALID_JOURNAL: A journal entry must have at least two balanced lines.");
  }

  // Calculate totals with 2 decimal precision
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const debit = Math.round((line.debit || 0) * 100) / 100;
    const credit = Math.round((line.credit || 0) * 100) / 100;

    if (debit < 0 || credit < 0) {
      throw new Error("INVALID_JOURNAL: Line debits and credits must be non-negative.");
    }
    if (debit > 0 && credit > 0) {
      throw new Error("INVALID_JOURNAL: A single line cannot have both debit and credit amounts.");
    }

    totalDebit = Math.round((totalDebit + debit) * 100) / 100;
    totalCredit = Math.round((totalCredit + credit) * 100) / 100;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `UNBALANCED_JOURNAL_ENTRY: Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)}).`
    );
  }

  // Generate sequential entry number if not provided
  const entryNumber =
    input.entryNumber ??
    `JE-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const entry = await db.journalEntry.create({
    data: {
      tenantId,
      entryNumber,
      date: input.date ?? new Date(),
      description,
      referenceId,
      referenceType,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || 0,
          credit: l.credit || 0,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  return entry;
}

/**
 * Retrieve account balance (Total Debits - Total Credits for Assets/Expenses; Credits - Debits for Liabilities/Revenue/Equity).
 */
export async function getAccountBalance(tenantId: string, accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      lines: true,
    },
  });

  if (!account || account.tenantId !== tenantId) {
    throw new Error("Account not found or tenant unauthorized");
  }

  const totalDebit = account.lines.reduce((acc, l) => acc + Number(l.debit), 0);
  const totalCredit = account.lines.reduce((acc, l) => acc + Number(l.credit), 0);

  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
  const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;

  return {
    account,
    totalDebit,
    totalCredit,
    balance: Math.round(balance * 100) / 100,
  };
}
