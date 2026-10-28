// Dashboard metrics (spec §14 definitions), scoped by leadWhereForUser.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadWhereForUser } from "@/lib/access";
import type { SessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/data/settings";
import { isSlaBreached } from "@/lib/data/sla";
import { OPEN_STAGES, STAGE_ORDER, STAGE_SHORT } from "@/lib/domain/stages";
import { SOURCE_LABEL } from "@/lib/domain/labels";
import { shortBranch } from "@/lib/domain/routing/decide";
import { formatIST, istDateKey, startOfIstDay, wallTime, workingMinutesBetween } from "@/lib/domain/time";

export type Period = "today" | "7d" | "30d" | "month";
export const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
];

export function periodStart(p: Period, now = new Date()): Date {
  if (p === "today") return startOfIstDay(now);
  if (p === "7d") return startOfIstDay(now, -6);
  if (p === "month") return wallTime(new Date(`${formatIST(now, "yyyy-MM")}-01T12:00:00+05:30`), "00:00");
  return startOfIstDay(now, -29);
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function dashboardData(user: SessionUser, period: Period, now = new Date()) {
  const scope = leadWhereForUser(user);
  const from = periodStart(period, now);
  const settings = await getSettings();
  const inPeriod: Prisma.LeadWhereInput = { AND: [scope, { createdAt: { gte: from } }] };
  const openScope: Prisma.LeadWhereInput = { AND: [scope, { stage: { in: OPEN_STAGES } }] };
  const thirty = startOfIstDay(now, -29);

  const [newLeads, cohort, newOpen, overdueTasks, ooa, visits, pipeline, won, bySource, byStage, byBranch, daily, responses, branches, attention, recent] = await Promise.all([
    prisma.lead.count({ where: inPeriod }),
    prisma.lead.groupBy({ by: ["stage"], where: inPeriod, _count: true }),
    prisma.lead.findMany({ where: { AND: [openScope, { stage: "NEW" }] }, select: { stage: true, firstContactedAt: true, assignedAt: true } }),
    prisma.task.findMany({
      where: { status: "OPEN", type: { in: ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP"] }, dueAt: { lt: now }, lead: scope },
      select: { assignee: { select: { name: true } } },
    }),
    prisma.lead.count({ where: { AND: [inPeriod, { locationStatus: "OUT_OF_AREA" }] } }),
    prisma.appointment.count({ where: { createdAt: { gte: from }, lead: scope } }),
    prisma.lead.findMany({ where: { AND: [openScope, { stage: { in: ["QUOTATION_SENT", "NEGOTIATION", "TOKEN_RECEIVED"] } }] }, select: { estimatedValueInr: true, orderValueInr: true } }),
    prisma.lead.aggregate({ where: { AND: [scope, { stage: "CLOSED_WON", stageChangedAt: { gte: from } }] }, _sum: { orderValueInr: true }, _count: true }),
    prisma.lead.groupBy({ by: ["source"], where: { AND: [scope, { createdAt: { gte: thirty } }] }, _count: true }),
    prisma.lead.groupBy({ by: ["stage"], where: openScope, _count: true }),
    prisma.lead.groupBy({ by: ["branchId", "locationStatus"], where: { AND: [scope, { createdAt: { gte: thirty } }] }, _count: true }),
    prisma.lead.findMany({ where: { AND: [scope, { createdAt: { gte: thirty } }] }, select: { createdAt: true } }),
    prisma.lead.findMany({ where: { AND: [scope, { createdAt: { gte: thirty }, firstContactedAt: { not: null } }] }, select: { createdAt: true, firstContactedAt: true, branchId: true } }),
    prisma.branch.findMany({ select: { id: true, name: true, kind: true } }),
    prisma.task.findMany({
      where: { status: "OPEN", dueAt: { lt: now }, lead: scope, type: { in: ["FIRST_CALL", "FOLLOW_UP", "QUOTATION_FOLLOW_UP", "ESCALATION", "CAPTURE_LOCATION"] } },
      include: { lead: { select: { id: true, refCode: true, firstName: true, lastName: true } }, assignee: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
    prisma.activity.findMany({
      where: { lead: scope, type: { in: ["STAGE_CHANGE", "HANDOVER", "CALL", "SHOWROOM_VISIT", "ASSIGNMENT"] } },
      include: { lead: { select: { id: true, refCode: true, firstName: true, lastName: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const wonN = cohort.find((c) => c.stage === "CLOSED_WON")?._count ?? 0;
  const lostN = cohort.find((c) => c.stage === "CLOSED_LOST")?._count ?? 0;
  const branchName = (id: string | null) => {
    const b = branches.find((x) => x.id === id);
    return b ? (b.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(b.name)) : null;
  };

  const overdueByRep = new Map<string, number>();
  for (const t of overdueTasks) overdueByRep.set(t.assignee.name, (overdueByRep.get(t.assignee.name) ?? 0) + 1);

  const branchCounts = new Map<string, number>();
  for (const b of byBranch) {
    const key = b.locationStatus === "OUT_OF_AREA" ? "Out of area" : b.locationStatus === "NEEDS_LOCATION" ? "Needs location" : (branchName(b.branchId) ?? "Unassigned");
    branchCounts.set(key, (branchCounts.get(key) ?? 0) + b._count);
  }

  const days: { key: string; label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = startOfIstDay(now, -i);
    days.push({ key: istDateKey(d), label: formatIST(d, "d MMM"), value: 0 });
  }
  for (const l of daily) {
    const day = days.find((d) => d.key === istDateKey(l.createdAt));
    if (day) day.value++;
  }

  const responseByBranch = new Map<string, number[]>();
  for (const r of responses) {
    const name = branchName(r.branchId) ?? "—";
    responseByBranch.set(name, [...(responseByBranch.get(name) ?? []), workingMinutesBetween(r.createdAt, r.firstContactedAt!, settings.workingHours)]);
  }

  return {
    kpis: {
      newLeads,
      uncontacted: newOpen.filter((l) => isSlaBreached(l, settings.sla.firstContactMins, settings.workingHours, now)).length,
      overdue: overdueTasks.length,
      outOfArea: ooa,
      visits,
      pipelineValue: pipeline.reduce((s, l) => s + (l.estimatedValueInr ?? l.orderValueInr ?? 0), 0),
      wonValue: won._sum.orderValueInr ?? 0,
      wonCount: won._count,
      conversion: wonN + lostN >= 5 ? Math.round((wonN / (wonN + lostN)) * 100) : null,
      conversionBase: wonN + lostN,
    },
    funnel: OPEN_STAGES.map((s) => ({ label: STAGE_SHORT[s], value: byStage.find((x) => x.stage === s)?._count ?? 0 })),
    sources: bySource
      .map((s) => ({ label: SOURCE_LABEL[s.source], value: s._count, highlight: s.source === "INSTAGRAM_PAID" }))
      .sort((a, b) => b.value - a.value),
    branches: [...branchCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    daily: days.map(({ label, value }) => ({ label, value })),
    overdueByRep: [...overdueByRep.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    responseTimes: [...responseByBranch.entries()]
      .filter(([n]) => n !== "—")
      .map(([label, xs]) => ({ label, value: Math.round(median(xs) ?? 0) }))
      .sort((a, b) => a.value - b.value),
    attention,
    recent,
    stageOrder: STAGE_ORDER,
  };
}
