// Loads what routing needs from the DB: branches, pincode rules, gazetteer, settings, branch members.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { OPEN_STAGES } from "@/lib/domain/stages";
import type { LocalityRef } from "@/lib/domain/geo/resolve";
import type { BranchForRouting, PincodeRuleForRouting } from "@/lib/domain/routing/decide";
import type { Member } from "@/lib/domain/routing/assign";
import type { Settings } from "@/lib/domain/settings";

type Db = Prisma.TransactionClient | typeof prisma;

export interface RoutingContext {
  branches: (BranchForRouting & { assignmentStrategy: "ROUND_ROBIN" | "LEAST_OPEN_LEADS" })[];
  rules: PincodeRuleForRouting[];
  localities: (LocalityRef & { id: string })[];
  settings: Settings;
}

export async function loadRoutingContext(): Promise<RoutingContext> {
  const [branches, rules, localities, settings] = await Promise.all([
    prisma.branch.findMany({ orderBy: { code: "asc" } }),
    prisma.branchPincode.findMany({ select: { pincode: true, branchId: true } }),
    prisma.locality.findMany(),
    getSettings(),
  ]);
  return { branches, rules, localities, settings };
}

export async function loadMembers(branchId: string, db: Db = prisma): Promise<Member[]> {
  const users = await db.user.findMany({
    where: { branchId },
    select: { id: true, name: true, role: true, isActive: true, receivesLeads: true, onLeave: true, onLeaveUntil: true, lastAssignedAt: true },
    orderBy: { name: "asc" },
  });
  const counts = await db.lead.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: users.map((u) => u.id) }, stage: { in: OPEN_STAGES } },
    _count: true,
  });
  const open = new Map(counts.map((c) => [c.ownerId, c._count]));
  return users.map((u) => ({ ...u, openLeads: open.get(u.id) ?? 0 }));
}

export async function nextRefCode(db: Db = prisma): Promise<string> {
  const [row] = await db.$queryRaw<{ n: bigint }[]>`SELECT nextval('lead_ref_seq') AS n`;
  return `EL-${row.n}`;
}
