import test from "node:test";
import assert from "node:assert/strict";
import { deriveLedgerStockFromMovements } from "../inventory/ledger.ts";

test("deriveLedgerStockFromMovements accurately reconstructs balance from transactions", async () => {
  const transactions = [
    { movementType: "PURCHASE_IN", quantityChange: 10, grossWeightChange: 100.5, stoneWeightChange: 0, netWeightChange: 100.5 },
    { movementType: "SALE_OUT", quantityChange: -2, grossWeightChange: -20.1, stoneWeightChange: 0, netWeightChange: -20.1 },
    { movementType: "SALE_OUT", quantityChange: -1, grossWeightChange: -10.05, stoneWeightChange: 0, netWeightChange: -10.05 },
    { movementType: "RETURN_IN", quantityChange: 1, grossWeightChange: 10.05, stoneWeightChange: 0, netWeightChange: 10.05 },
    { movementType: "ADJUSTMENT_OUT", quantityChange: 0, grossWeightChange: -0.2, stoneWeightChange: 0, netWeightChange: -0.2 },
  ];

  const mockDb = {
    inventoryTransaction: {
      findMany: async () => transactions,
    },
    inventory: {
      findUnique: async () => ({ quantity: 8 }),
    },
  } as unknown as Parameters<typeof deriveLedgerStockFromMovements>[3];

  const balance = await deriveLedgerStockFromMovements("tenant-1", "branch-main", "prod-1", mockDb);

  // Quantity: 10 - 2 - 1 + 1 = 8
  assert.equal(balance.derivedQuantity, 8);
  // Net weight: 100.5 - 20.1 - 10.05 + 10.05 - 0.2 = 80.2
  assert.equal(balance.derivedNetWeight, 80.2);
  assert.equal(balance.derivedGrossWeight, 80.2);
  assert.equal(balance.isReconciled, true);
});
