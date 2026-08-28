import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "jewelbill-dev-secret-change-in-production-32chars"
);

// ─────────────────────────────────────────────────────────────────────────────
// Password Utilities
// ─────────────────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT Token Management
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  tenantId: string | null;
  role: string;
  isSuperAdmin: boolean;
  name: string;
  email: string;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Name
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_COOKIE = "jewelbill_session";

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Isolation Guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that a resource's tenantId matches the session's tenantId.
 * Super admins bypass this check.
 * Throws an error if isolation is violated.
 */
export function assertTenantAccess(
  session: SessionPayload,
  resourceTenantId: string
): void {
  if (session.isSuperAdmin) return; // Super admins can access everything
  if (session.tenantId !== resourceTenantId) {
    throw new Error("TENANT_ISOLATION_VIOLATION");
  }
}

/**
 * Require a role or higher to proceed.
 * Role hierarchy: SUPER_ADMIN > SHOP_OWNER > MANAGER > ACCOUNTANT > CASHIER > STAFF
 */
const ROLE_WEIGHT: Record<string, number> = {
  SUPER_ADMIN: 100,
  SHOP_OWNER: 80,
  MANAGER: 60,
  ACCOUNTANT: 50,
  CASHIER: 40,
  STAFF: 20,
};

export function hasRole(
  session: SessionPayload,
  requiredRole: string
): boolean {
  const userWeight = ROLE_WEIGHT[session.role] ?? 0;
  const requiredWeight = ROLE_WEIGHT[requiredRole] ?? 0;
  return userWeight >= requiredWeight;
}

export function assertRole(session: SessionPayload, requiredRole: string): void {
  if (!hasRole(session, requiredRole)) {
    throw new Error(`INSUFFICIENT_ROLE: requires ${requiredRole}`);
  }
}
