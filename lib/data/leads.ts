// Lead queries. Every one applies the user's scope from lib/auth/scope.ts (06 §5.3).
import type { LocationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { leadWhere, userWhere, visibleBranchIds } from "@/lib/auth/scope";
import { startOfIstDay } from "@/lib/domain/time";

export const LEAD_VIEWS = [
  { key: "my", label: "My open" },
  { key: "today", label: "Due today" },
  { key: "overdue", label: "Overdue" },
  { key: "needs-location", label: "Needs location" },
  { key: "out-of-area", label: "Out of area" },
  { key: "returning", label: "Returning" },
  { key: "all", label: "All" },
] as const;
export type LeadView = (typeof LEAD_VIEWS)[number]["key"];

export interface LeadFilters {
  view?: LeadView;
  q?: string;
  pipelineId?: string;
  stage?: string[]; // stage ids
  branchId?: string;
  ownerId?: string;
  source?: string; // source id
  product?: string; // product id
  locationStatus?: LocationStatus;
  followUp?: "overdue" | "today" | "none";
  from?: Date;
  to?: Date;
  returning?: boolean;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseLeadFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const stage = sp.stage ? (Array.isArray(sp.stage) ? sp.stage : sp.stage.split(",")).filter(Boolean) : undefined;
  const from = one(sp.from);
  const to = one(sp.to);
  return {
    view: (one(sp.view) as LeadView) ?? undefined,
    q: one(sp.q),
    pipelineId: one(sp.pipeline),
    stage,
    branchId: one(sp.branch),
    ownerId: one(sp.owner),
    source: one(sp.source),
    product: one(sp.product),
    locationStatus: one(sp.location) as LocationStatus | undefined,
    followUp: one(sp.followUp) as LeadFilters["followUp"],
    from: from ? new Date(`${from}T00:00:00+05:30`) : undefined,
    to: to ? new Date(`${to}T23:59:59+05:30`) : undefined,
    returning: one(sp.returning) === "1" ? true : undefined,
  };
}

type ScopeUser = Pick<CurrentUser, "id" | "scope" | "branchIds" | "permissions">;

export function leadFilterWhere(user: ScopeUser, f: LeadFilters, now = new Date()): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [leadWhere(user)];
  const todayStart = startOfIstDay(now);
  const tomorrowStart = startOfIstDay(now, 1);
  const open: Prisma.LeadWhereInput = { stage: { category: "OPEN" } };
  const ownOnly = user.scope === "OWN";

  switch (f.view) {
    case "my":
      and.push({ ownerId: user.id }, open);
      break;
    case "today":
      and.push(open, { nextFollowUpAt: { gte: todayStart, lt: tomorrowStart } });
      if (ownOnly) and.push({ ownerId: user.id });
      break;
    case "overdue":
      and.push(open, { nextFollowUpAt: { lt: now } });
      if (ownOnly) and.push({ ownerId: user.id });
      break;
    case "needs-location":
      and.push(open, { locationStatus: "NEEDS_LOCATION" });
      break;
    case "out-of-area":
      and.push(open, { locationStatus: "OUT_OF_AREA" });
      break;
    case "returning":
      and.push({ isReturning: true });
      break;
  }

  if (f.q) {
    const q = f.q.trim();
    const digits = q.replace(/\D/g, "");
    const ref = q.toUpperCase().match(/^(EL-?)?(\d{3,})$/);
    const or: Prisma.LeadWhereInput[] = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { siteAddressRaw: { contains: q, mode: "insensitive" } },
    ];
    if (q.includes(" ")) {
      const [a, ...rest] = q.split(" ");
      or.push({ AND: [{ firstName: { contains: a, mode: "insensitive" } }, { lastName: { contains: rest.join(" "), mode: "insensitive" } }] });
    }
    if (digits.length >= 4) or.push({ phoneE164: { contains: digits.slice(-10) } });
    if (ref) or.push({ refCode: `EL-${ref[2]}` });
    and.push({ OR: or });
  }
  if (f.pipelineId) and.push({ pipelineId: f.pipelineId });
  if (f.stage?.length) and.push({ stageId: { in: f.stage } });
  if (f.branchId) and.push({ branchId: f.branchId });
  if (f.ownerId) and.push({ ownerId: f.ownerId === "none" ? null : f.ownerId });
  if (f.source) and.push({ sourceId: f.source });
  if (f.product) and.push({ products: { some: { id: f.product } } });
  if (f.locationStatus) and.push({ locationStatus: f.locationStatus });
  if (f.followUp === "overdue") and.push(open, { nextFollowUpAt: { lt: now } });
  if (f.followUp === "today") and.push(open, { nextFollowUpAt: { gte: todayStart, lt: tomorrowStart } });
  if (f.followUp === "none") and.push(open, { nextFollowUpAt: null });
  if (f.from || f.to) and.push({ createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } });
  if (f.returning) and.push({ isReturning: true });
  return { AND: and };
}

export const leadListSelect = {
  id: true,
  refCode: true,
  firstName: true,
  lastName: true,
  phoneE164: true,
  siteAddressRaw: true,
  stage: { select: { id: true, label: true, color: true, category: true, isActive: true } },
  products: { select: { id: true, name: true, isActive: true }, orderBy: { sortOrder: "asc" } },
  source: { select: { id: true, name: true, color: true, isActive: true } },
  priority: true,
  nextFollowUpAt: true,
  createdAt: true,
  assignedAt: true,
  firstContactedAt: true,
  estimatedValueInr: true,
  orderValueInr: true,
  isReturning: true,
  locationStatus: true,
  locality: { select: { name: true } },
  branch: { select: { id: true, name: true, kind: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.LeadSelect;

export type LeadListItem = Prisma.LeadGetPayload<{ select: typeof leadListSelect }>;

export async function listLeads(user: ScopeUser, f: LeadFilters, take = 200) {
  const where = leadFilterWhere(user, f);
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: leadListSelect,
      orderBy: f.view === "today" || f.view === "overdue" ? [{ nextFollowUpAt: "asc" }] : [{ createdAt: "desc" }],
      take,
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total };
}

/** null when the lead doesn't exist OR is outside the user's scope (the page answers 404 either way). */
export async function getLeadForUser(user: ScopeUser, id: string) {
  return prisma.lead.findFirst({
    where: { AND: [{ id }, leadWhere(user)] },
    include: {
      stage: true,
      pipeline: { select: { id: true, name: true } },
      source: true,
      products: { orderBy: { sortOrder: "asc" } },
      branch: true,
      owner: { select: { id: true, name: true, phone: true, branchId: true } },
      handedOverBy: { select: { name: true } },
      locality: true,
      contact: { select: { id: true, firstName: true, lastName: true } },
      architect: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
      duplicateOf: { select: { id: true, refCode: true, stage: { select: { label: true, category: true } }, createdAt: true } },
      duplicates: { select: { id: true, refCode: true, stage: { select: { label: true, category: true } }, createdAt: true }, orderBy: { createdAt: "desc" } },
      routingDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } }, take: 200 },
      tasks: { where: { status: { in: ["OPEN", "SNOOZED"] } }, orderBy: { dueAt: "asc" }, include: { assignee: { select: { name: true } } } },
      appointments: { orderBy: { scheduledAt: "desc" }, include: { host: { select: { name: true } }, branch: { select: { name: true } } } },
      deal: { select: { id: true, title: true, amount: true } },
      project: { select: { id: true, stage: true } },
    },
  });
}

/** Reassign targets: active people you can see who receive leads (06 §5.3), grouped by branch in the UI. */
export async function assignableUsers(user: ScopeUser) {
  return prisma.user.findMany({
    where: { AND: [userWhere(user), { isActive: true, receivesLeads: true }] },
    select: { id: true, name: true, onLeave: true, role: { select: { name: true } }, branch: { select: { id: true, name: true } } },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });
}

/** Active branches the user can see (all for ALL scope). */
export async function branchesList(user?: ScopeUser) {
  const ids = user ? visibleBranchIds(user) : null;
  return prisma.branch.findMany({ where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) }, orderBy: [{ kind: "desc" }, { name: "asc" }] });
}
