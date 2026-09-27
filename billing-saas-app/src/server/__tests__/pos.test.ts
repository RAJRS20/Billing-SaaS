import test from "node:test";
import assert from "node:assert/strict";
import prisma from "../../lib/prisma.ts";
import { finalizeSale } from "../sales/pos.ts";

test("finalizeSale creates sale atomically and updates inventory, payments, accounting", async () => {
  // Find seeded tenant, user, branch, product, customer
  const tenant = await prisma.tenant.findFirst();
  assert.ok(tenant, "Tenant must exist");

  const branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  assert.ok(branch, "Branch must exist");

  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  assert.ok(user, "User must exist");

  const product = await prisma.product.findFirst({ where: { tenantId: tenant.id } });
  assert.ok(product, "Product must exist");

  const customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id } });
  assert.ok(customer, "Customer must exist");

  // Ensure stock is available for the test run
  const invBefore = await prisma.inventory.upsert({
    where: {
      tenantId_branchId_productId: {
        tenantId: tenant.id,
        branchId: branch.id,
        productId: product.id,
      },
    },
    update: { quantity: 10 },
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      productId: product.id,
      quantity: 10,
    },
  });
  const qtyBefore = invBefore.quantity;

  // Execute finalizeSale
  const result = await finalizeSale({
    tenantId: tenant.id,
    branchId: branch.id,
    userId: user.id,
    customerId: customer.id,
    items: [
      {
        productId: product.id,
        quantity: 1,
      },
    ],
    payments: [
      {
        method: "CASH",
        amount: 0,
      },
    ],
  });

  const sale = result.sale;
  assert.ok(sale.id, "Sale ID must be generated");
  assert.ok(sale.invoiceNumber, "Invoice number must be generated");
  assert.equal(result.preparedItems.length, 1);
  assert.equal(sale.status, "COMPLETED");

  // Verify inventory deduction
  const invAfter = await prisma.inventory.findUnique({
    where: {
      tenantId_branchId_productId: {
        tenantId: tenant.id,
        branchId: branch.id,
        productId: product.id,
      },
    },
  });
  assert.equal(invAfter?.quantity, qtyBefore - 1);

  // Verify InventoryTransaction SALE_OUT record exists
  const invTxn = await prisma.inventoryTransaction.findFirst({
    where: {
      referenceId: sale.id,
      type: "SALE_OUT",
    },
  });
  assert.ok(invTxn, "InventoryTransaction SALE_OUT must exist");
  assert.equal(invTxn.quantityChange, -1);

  // Verify balanced Journal Entry exists
  const journal = await prisma.journalEntry.findFirst({
    where: {
      referenceId: sale.id,
      referenceType: "SALE",
    },
    include: { lines: true },
  });
  assert.ok(journal, "JournalEntry must exist for sale");
  assert.ok(journal.lines.length >= 2, "Journal entry must have at least 2 lines");
  const totalDebit = journal.lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = journal.lines.reduce((s, l) => s + Number(l.credit), 0);
  assert.ok(
    Math.abs(totalDebit - totalCredit) < 0.01,
    `Journal entry must balance: Debit ${totalDebit} vs Credit ${totalCredit}`
  );
});

test("finalizeSale rolls back completely if product not found or quantity is invalid", async () => {
  const tenant = await prisma.tenant.findFirst();
  assert.ok(tenant);
  const branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  assert.ok(branch);
  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  assert.ok(user);

  const initialSalesCount = await prisma.sale.count({ where: { tenantId: tenant.id } });

  await assert.rejects(
    async () => {
      await finalizeSale({
        tenantId: tenant.id,
        branchId: branch.id,
        userId: user.id,
        items: [
          {
            productId: "non-existent-product-id",
            quantity: 1,
          },
        ],
        payments: [{ method: "CASH", amount: 1000 }],
      });
    },
    {
      message: /not found/i,
    }
  );

  // Confirm NO sale was recorded
  const afterSalesCount = await prisma.sale.count({ where: { tenantId: tenant.id } });
  assert.equal(afterSalesCount, initialSalesCount, "Sales count must not change on failure");
});
