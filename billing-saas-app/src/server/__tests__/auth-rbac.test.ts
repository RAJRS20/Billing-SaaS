import test from "node:test";
import assert from "node:assert/strict";
import { assertTenantAccess, hasRole, assertRole } from "../../lib/auth.ts";
import type { SessionPayload } from "../../lib/auth.ts";

test("assertTenantAccess allows access when tenantId matches", () => {
  const session: SessionPayload = {
    userId: "user-1",
    tenantId: "tenant-slj",
    role: "CASHIER",
    isSuperAdmin: false,
    name: "Cashier",
    email: "cashier@test.com",
  };

  assert.doesNotThrow(() => {
    assertTenantAccess(session, "tenant-slj");
  });
});

test("assertTenantAccess throws TENANT_ISOLATION_VIOLATION when accessing another tenant's resource", () => {
  const session: SessionPayload = {
    userId: "user-1",
    tenantId: "tenant-slj",
    role: "CASHIER",
    isSuperAdmin: false,
    name: "Cashier",
    email: "cashier@test.com",
  };

  assert.throws(
    () => {
      assertTenantAccess(session, "tenant-other");
    },
    {
      message: /TENANT_ISOLATION_VIOLATION/,
    }
  );
});

test("assertTenantAccess permits super admin to access any tenant", () => {
  const superAdminSession: SessionPayload = {
    userId: "super-1",
    tenantId: null,
    role: "SUPER_ADMIN",
    isSuperAdmin: true,
    name: "Platform Admin",
    email: "admin@platform.com",
  };

  assert.doesNotThrow(() => {
    assertTenantAccess(superAdminSession, "tenant-other");
  });
});

test("RBAC hierarchy: CASHIER cannot perform MANAGER or SHOP_OWNER operations", () => {
  const cashierSession: SessionPayload = {
    userId: "user-cashier",
    tenantId: "tenant-slj",
    role: "CASHIER",
    isSuperAdmin: false,
    name: "Cashier",
    email: "cashier@test.com",
  };

  assert.equal(hasRole(cashierSession, "CASHIER"), true);
  assert.equal(hasRole(cashierSession, "MANAGER"), false);
  assert.equal(hasRole(cashierSession, "SHOP_OWNER"), false);

  assert.throws(
    () => {
      assertRole(cashierSession, "MANAGER");
    },
    {
      message: /INSUFFICIENT_ROLE/,
    }
  );
});

test("RBAC hierarchy: SHOP_OWNER can perform all operational roles", () => {
  const ownerSession: SessionPayload = {
    userId: "user-owner",
    tenantId: "tenant-slj",
    role: "SHOP_OWNER",
    isSuperAdmin: false,
    name: "Owner",
    email: "owner@test.com",
  };

  assert.equal(hasRole(ownerSession, "STAFF"), true);
  assert.equal(hasRole(ownerSession, "CASHIER"), true);
  assert.equal(hasRole(ownerSession, "ACCOUNTANT"), true);
  assert.equal(hasRole(ownerSession, "MANAGER"), true);
  assert.equal(hasRole(ownerSession, "SHOP_OWNER"), true);
});
