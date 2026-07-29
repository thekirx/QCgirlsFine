import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { permissionsForRoles, type Permission, type RoleCode } from "@/modules/auth/policy";
import { prisma } from "@/server/db/client";

export const SESSION_COOKIE = "questcare_session";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(client: PrismaClient, userId: string) {
  const token = randomBytes(32).toString("base64url");
  await client.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  return token;
}
export async function revokeSession(client: PrismaClient, token: string) {
  await client.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}
export async function sessionPrincipal(client: PrismaClient, token: string) {
  const session = await client.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { roles: { include: { role: true } } } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;
  const roles = session.user.roles.map(({ role }) => role.code as RoleCode);
  return { id: session.user.id, username: session.user.username, displayName: session.user.displayName, roles, permissions: permissionsForRoles(roles) };
}
export async function currentPrincipal() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sessionPrincipal(prisma, token) : null;
}
export async function requirePermission(permission?: Permission) {
  const principal = await currentPrincipal();
  if (!principal || (permission && !principal.permissions.has(permission))) throw new Error("UNAUTHORIZED");
  return principal;
}
