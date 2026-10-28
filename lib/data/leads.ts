// Lead queries. Every one applies leadWhereForUser() (spec §6.2).
import type { LeadStage, LeadSource, LocationStatus, Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadWhereForUser } from "@/lib/access";
import type { SessionUser } from "@/lib/auth";
import { OPEN_STAGES } from "@/lib/domain/stages";
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
  stage?: LeadStage[];
  branchId?: string;
  ownerId?: string;
  source?: LeadSource;
  product?: Product;
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
    stage: stage as LeadStage[] | undefined,
    branchId: one(sp.branch),
    ownerId: one(sp.owner),
    source: one(sp.source) as LeadSource | undefined,
    product: one(sp.product) as Product | undefined,
    locationStatus: one(sp.location) as LocationStatus | undefined,
    followUp: one(sp.followUp) as LeadFilters["followUp"],
    from: from ? new Date(`${from}T00:00:00+05:30`) : undefined,
    to: to ? new Date(`${to}T23:59:59+05:30`) : undefined,
    returning: one(sp.returning) === "1" ? true : undefined,
  };
}

export function leadWhere(user: SessionUser, f: LeadFilters, now = new Date()): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [leadWhereForUser(user)];
  const todayStart = startOfIstDay(now);
  const tomorrowStart = startOfIstDay(now, 1);
  const open = { stage: { in: OPEN_STAGES } };

  switch (f.view) {
    case "my":
      and.push({ ownerId: user.id }, open);
      break;
    case "today":
      and.push(open, { nextFollowUpAt: { gte: todayStart, lt: tomorrowStart } });
      if (user.role === "SALES_REP" || user.role === "PRESALES") and.push({ ownerId: user.id });
      break;
    case "overdue":
      and.push(open, { nextFollowUpAt: { lt: now } });
      if (user.role === "SALES_REP" || user.role === "PRESALES") and.push({ ownerId: user.id });
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
  if (f.stage?.length) and.push({ stage: { in: f.stage } });
  if (f.branchId) and.push({ branchId: f.branchId });
  if (f.ownerId) and.push({ ownerId: f.ownerId === "none" ? null : f.ownerId });
  if (f.source) and.push({ source: f.source });
  if (f.product) and.push({ products: { has: f.product } });
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
  stage: true,
  lostReason: true,
  products: true,
  source: true,
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

export async function listLeads(user: SessionUser, f: LeadFilters, take = 200) {
  const where = leadWhere(user, f);
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

export async function getLeadForUser(user: SessionUser, id: string) {
  return prisma.lead.findFirst({
    where: { AND: [{ id }, leadWhereForUser(user)] },
    include: {
      branch: true,
      owner: { select: { id: true, name: true, phone: true, branchId: true } },
      handedOverBy: { select: { name: true } },
      locality: true,
      contact: { select: { id: true, firstName: true, lastName: true } },
      architect: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
      duplicateOf: { select: { id: true, refCode: true, stage: true, createdAt: true } },
      duplicates: { select: { id: true, refCode: true, stage: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      routingDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } }, take: 200 },
      tasks: { where: { status: { in: ["OPEN", "SNOOZED"] } }, orderBy: { dueAt: "asc" }, include: { assignee: { select: { name: true } } } },
      appointments: { orderBy: { scheduledAt: "desc" }, include: { host: { select: { name: true } }, branch: { select: { name: true } } } },
      deal: { select: { id: true, title: true, amount: true } },
      project: { select: { id: true, stage: true } },
    },
  });
}

/** People a manager can assign to: everyone active, grouped by branch in the UI. */
export async function assignableUsers() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ["SALES_REP", "SALES_MANAGER", "PRESALES"] } },
    select: { id: true, name: true, role: true, onLeave: true, branch: { select: { id: true, name: true } } },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });
}

export async function branchesList() {
  return prisma.branch.findMany({ where: { isActive: true }, orderBy: [{ kind: "desc" }, { name: "asc" }] });
}
