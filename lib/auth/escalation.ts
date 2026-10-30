// Anti-escalation guards (06 §5.4). PURE: each returns an error message or null.
import type { DataScope } from "@prisma/client";
import { SCOPE_ORDER } from "./permissions";
import type { CurrentUser } from "./current-user";
import { canSeeUser } from "./scope";

type Actor = Pick<CurrentUser, "id" | "scope" | "branchIds" | "permissions" | "isSuperAdmin">;
type RoleShape = { id: string; name: string; scope: DataScope; permissions: string[]; isLocked: boolean };

/** You can hand out a role only if it can't do or see more than you. */
export function roleAssignError(actor: Actor, role: RoleShape): string | null {
  if (role.isLocked && !actor.isSuperAdmin) return `Only a ${role.name} can make someone ${role.name}.`;
  if (SCOPE_ORDER[role.scope] > SCOPE_ORDER[actor.scope]) return `"${role.name}" sees more data than you do, so you can't assign it.`;
  const extra = role.permissions.filter((p) => !actor.permissions.includes(p as never));
  if (extra.length) return `"${role.name}" has permissions you don't have (${extra.slice(0, 3).join(", ")}${extra.length > 3 ? "…" : ""}).`;
  return null;
}

/** Editing a role's definition: never beyond your own scope/permissions; the locked role is fixed. */
export function roleEditError(actor: Actor, before: RoleShape | null, after: { scope: DataScope; permissions: string[] }): string | null {
  if (before?.isLocked && (before.scope !== after.scope || before.permissions.slice().sort().join() !== after.permissions.slice().sort().join())) {
    return `${before.name}'s scope and permissions can't be changed.`;
  }
  if (SCOPE_ORDER[after.scope] > SCOPE_ORDER[actor.scope]) return "A role can't see more data than you do.";
  const extra = after.permissions.filter((p) => !actor.permissions.includes(p as never));
  if (extra.length) return `You can't grant permissions you don't have (${extra.slice(0, 3).join(", ")}).`;
  return null;
}

export interface UserChange {
  target: { id: string; branchId: string | null; roleId: string; isActive: boolean; isSuperAdmin: boolean } | null; // null = new user
  next: { branchId: string | null; extraBranchIds: string[]; role: RoleShape; isActive: boolean };
  activeSuperAdmins: number;
}

export function userChangeError(actor: Actor, { target, next, activeSuperAdmins }: UserChange): string | null {
  if (target && !canSeeUser(actor, target)) return "User not found.";
  const self = target?.id === actor.id;
  if (self && (target!.roleId !== next.role.id)) return "You can't change your own role.";
  if (self && !next.isActive) return "You can't deactivate yourself.";
  if (actor.scope === "BRANCH") {
    const branches = [next.branchId, ...next.extraBranchIds].filter(Boolean) as string[];
    if (!next.branchId) return "Pick one of your branches as the home branch.";
    if (branches.some((b) => !actor.branchIds.includes(b))) return "You can only place people in your own branches.";
  }
  if (!target || target.roleId !== next.role.id) {
    const err = roleAssignError(actor, next.role);
    if (err) return err;
  }
  const losesSuperAdmin = target?.isSuperAdmin && target.isActive && (!next.isActive || !next.role.isLocked);
  if (losesSuperAdmin && activeSuperAdmins <= 1) return "This is the last active Super Admin. Make someone else Super Admin first.";
  return null;
}
