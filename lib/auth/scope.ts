// The ONLY place that decides which leads and users someone can see (06 §5.3).
// OWN → leads you own (+ ones you handed over, read-only); BRANCH → your branches' leads and people;
// ALL → everything. Queue permissions add the unrouted leads (needs location / out of area).
import type { LocationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "./current-user";

type ScopeUser = Pick<CurrentUser, "id" | "scope" | "branchIds" | "permissions">;
type Db = Prisma.TransactionClient | typeof prisma;

function unroutedClauses(user: ScopeUser): Prisma.LeadWhereInput[] {
  const out: Prisma.LeadWhereInput[] = [];
  if (user.permissions.includes("queues.needsLocation")) out.push({ locationStatus: "NEEDS_LOCATION" });
  if (user.permissions.includes("queues.outOfArea")) out.push({ locationStatus: "OUT_OF_AREA" });
  return out;
}

export function leadWhere(user: ScopeUser): Prisma.LeadWhereInput {
  switch (user.scope) {
    case "ALL":
      return {};
    case "BRANCH":
      return { OR: [...(user.branchIds.length ? [{ branchId: { in: user.branchIds } }] : []), { ownerId: user.id }, ...unroutedClauses(user)] };
    case "OWN":
    default:
      return { OR: [{ ownerId: user.id }, { handedOverById: user.id }, ...unroutedClauses(user)] };
  }
}

export interface LeadAccessShape {
  ownerId: string | null;
  branchId: string | null;
  locationStatus: LocationStatus;
  handedOverById: string | null;
}

/** Same rules as leadWhere(), for one loaded lead. */
export function canSeeLead(user: ScopeUser, lead: LeadAccessShape): boolean {
  if (user.scope === "ALL") return true;
  if (lead.ownerId === user.id) return true;
  if (user.permissions.includes("queues.needsLocation") && lead.locationStatus === "NEEDS_LOCATION") return true;
  if (user.permissions.includes("queues.outOfArea") && lead.locationStatus === "OUT_OF_AREA") return true;
  if (user.scope === "BRANCH") return !!lead.branchId && user.branchIds.includes(lead.branchId);
  return lead.handedOverById === user.id;
}

/** Visible + `leads.edit`. Leads you handed over stay read-only (OWN scope). */
export function canEditLead(user: ScopeUser, lead: LeadAccessShape): boolean {
  if (!user.permissions.includes("leads.edit") || !canSeeLead(user, lead)) return false;
  if (user.scope === "OWN" && lead.ownerId !== user.id) return user.permissions.includes("queues.needsLocation") && lead.locationStatus === "NEEDS_LOCATION";
  return true;
}

/** Who you can see in Users, Team, owner pickers and reports. */
export function userWhere(user: ScopeUser): Prisma.UserWhereInput {
  switch (user.scope) {
    case "ALL":
      return {};
    case "BRANCH":
      return { OR: [...(user.branchIds.length ? [{ branchId: { in: user.branchIds } }] : []), { id: user.id }] };
    case "OWN":
    default:
      return { id: user.id };
  }
}

export function canSeeUser(user: ScopeUser, target: { id: string; branchId: string | null }): boolean {
  if (user.scope === "ALL" || target.id === user.id) return true;
  return user.scope === "BRANCH" && !!target.branchId && user.branchIds.includes(target.branchId);
}

/** Branch ids a user can work with in pickers/filters (null = every branch). */
export const visibleBranchIds = (user: ScopeUser): string[] | null => (user.scope === "ALL" ? null : user.branchIds);

// ---------- recipients (replace the old role-enum lookups) ----------

/** Business owners: active users holding the locked Super Admin role. */
export async function superAdminIds(db: Db = prisma): Promise<string[]> {
  const rows = await db.user.findMany({ where: { isActive: true, role: { isLocked: true } }, select: { id: true }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => r.id);
}

/** Managers of a branch: active BRANCH-scope users covering it, home-branch managers first. */
export async function branchManagers(branchId: string, db: Db = prisma): Promise<{ id: string; name: string; branchId: string | null }[]> {
  const rows = await db.user.findMany({
    where: { isActive: true, role: { scope: "BRANCH" }, OR: [{ branchId }, { extraBranches: { some: { id: branchId } } }] },
    select: { id: true, name: true, branchId: true },
    orderBy: { name: "asc" },
  });
  return rows.sort((a, b) => Number(b.branchId === branchId) - Number(a.branchId === branchId));
}
