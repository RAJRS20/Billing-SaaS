import test from "node:test";
import assert from "node:assert/strict";
import { postJournalEntry } from "../accounting/journal.ts";

test("postJournalEntry throws error when Total Debit does not equal Total Credit", async () => {
  const unbalancedLines = [
    { accountId: "acc-cash", debit: 5000, credit: 0, description: "Cash received" },
    { accountId: "acc-sales", debit: 0, credit: 4500, description: "Sales revenue" }, // Mismatch by 500!
  ];

  await assert.rejects(
    async () => {
      const mockDb = {} as unknown as Parameters<typeof postJournalEntry>[1];
      await postJournalEntry(
        {
          tenantId: "tenant-1",
          date: new Date(),
          description: "Unbalanced sale",
          referenceType: "SALE",
          lines: unbalancedLines,
        },
        mockDb
      );
    },
    {
      message: /UNBALANCED_JOURNAL_ENTRY/,
    }
  );
});

test("postJournalEntry accepts perfectly balanced debit and credit entries", async () => {
  const balancedLines = [
    { accountId: "acc-cash", debit: 5000, credit: 0, description: "Cash received" },
    { accountId: "acc-sales", debit: 0, credit: 4500, description: "Gold sales" },
    { accountId: "acc-gst", debit: 0, credit: 500, description: "GST output" },
  ];

  let createdLines: { debit?: number; credit?: number }[] = [];

  const mockDb = {
    journalEntry: {
      count: async () => 0,
      create: async ({ data }: { data: { lines: { create: { debit?: number; credit?: number }[] } } }) => {
        createdLines = data.lines.create;
        return { id: "je-123", ...data, lines: createdLines };
      },
    },
  } as unknown as Parameters<typeof postJournalEntry>[1];

  const result = await postJournalEntry(
    {
      tenantId: "tenant-1",
      date: new Date(),
      description: "Balanced sale with GST",
      referenceType: "SALE",
      referenceId: "sale-001",
      lines: balancedLines,
    },
    mockDb
  );

  assert.equal(result.id, "je-123");
  assert.equal(createdLines.length, 3);
  const totalDebit = createdLines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = createdLines.reduce((s, l) => s + (l.credit ?? 0), 0);
  assert.equal(totalDebit, 5000);
  assert.equal(totalCredit, 5000);
});
