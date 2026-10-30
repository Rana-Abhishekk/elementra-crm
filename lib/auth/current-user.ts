// Who is asking, loaded fresh from the DB once per request (React cache). The JWT only holds the id,
// so a role change, a branch change or a deactivation applies on the very next request.
import { cache } from "react";
import type { DataScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPermission, type Permission } from "./permissions";
import { getSessionUserId } from "./options";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  scope: DataScope;
  permissions: Permission[];
  /** The locked Super Admin role (business owner). */
  isSuperAdmin: boolean;
  /** Home branch (routing/assignment). */
  branchId: string | null;
  /** Home + extra branches: what BRANCH scope covers. */
  branchIds: string[];
  receivesLeads: boolean;
  mustChangePassword: boolean;
}

export const userWithRoleInclude = {
  role: { select: { id: true, name: true, scope: true, permissions: true, isLocked: true } },
  extraBranches: { select: { id: true } },
} as const;

type UserRow = {
  id: string;
  name: string;
  email: string;
  branchId: string | null;
  receivesLeads: boolean;
  mustChangePassword: boolean;
  role: { id: string; name: string; scope: DataScope; permissions: string[]; isLocked: boolean };
  extraBranches: { id: string }[];
};

export function toCurrentUser(u: UserRow): CurrentUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.role.id,
    roleName: u.role.name,
    scope: u.role.scope,
    permissions: u.role.permissions.filter(isPermission),
    isSuperAdmin: u.role.isLocked,
    branchId: u.branchId,
    branchIds: [...new Set([...(u.branchId ? [u.branchId] : []), ...u.extraBranches.map((b) => b.id)])],
    receivesLeads: u.receivesLeads,
    mustChangePassword: u.mustChangePassword,
  };
}

export async function loadCurrentUser(userId: string): Promise<CurrentUser | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: userWithRoleInclude });
  if (!u || !u.isActive) return null;
  return toCurrentUser(u);
}

/** null when signed out, deleted or deactivated. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const id = await getSessionUserId();
  return id ? loadCurrentUser(id) : null;
});

export const getOptionalUser = getCurrentUser;

/** For server components and actions. Pages are protected by the dashboard layout's redirect. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session has ended. Please sign in again.");
  return user;
}
