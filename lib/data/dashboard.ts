// Dashboard metrics (spec §14 definitions), scoped by leadWhere (lib/auth/scope.ts).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { getSettings } from "@/lib/data/settings";
import { getMasters } from "@/lib/data/masters";
import { isSlaBreached } from "@/lib/data/sla";
import { can } from "@/lib/auth/guards";
import { conversionPct, monthKeys, monthlyRunRate, pctChange, reachedCounts, weeklyGroups } from "@/lib/domain/dashboard-trends";
import { openStages, shortLabel } from "@/lib/domain/stages";
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

const TREND_WEEKS = 8;
const ACTUAL_MONTHS_BACK = 5;
const FORECAST_MONTHS = 2;
const TOP_DEALS = 5;
const TOP_PEOPLE = 6;

const leadValue = (l: { estimatedValueInr: number | null; orderValueInr: number | null }) => l.estimatedValueInr ?? l.orderValueInr ?? 0;
const wonValue = (l: { estimatedValueInr: number | null; orderValueInr: number | null }) => l.orderValueInr ?? l.estimatedValueInr ?? 0;

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function dashboardData(user: Pick<CurrentUser, "id" | "scope" | "branchIds" | "permissions">, period: Period, now = new Date(), pipelineId?: string) {
  const scope = leadWhere(user);
  const from = periodStart(period, now);
  const [settings, masters] = await Promise.all([getSettings(), getMasters()]);
  const funnelPipeline = (pipelineId && masters.pipelineById.get(pipelineId)) || masters.defaultPipeline;
  const inPeriod: Prisma.LeadWhereInput = { AND: [scope, { createdAt: { gte: from } }] };
  const openScope: Prisma.LeadWhereInput = { AND: [scope, { stage: { category: "OPEN" } }] };
  const thirty = startOfIstDay(now, -29);
  const prevFrom = new Date(from.getTime() - (now.getTime() - from.getTime()));
  const inPrevPeriod: Prisma.DateTimeFilter = { gte: prevFrom, lt: from };
  const trendFrom = startOfIstDay(now, 1 - TREND_WEEKS * 7);
  const months = monthKeys(now, ACTUAL_MONTHS_BACK, FORECAST_MONTHS);
  const historyFrom = wallTime(new Date(`${months[0].key}-01T12:00:00+05:30`), "00:00");
  const showPeople = can(user, "team.performance");

  const [newLeads, cohort, newOpen, overdueTasks, ooa, visits, pipeline, won, bySource, byStage, byBranch, daily, responses, branches, attention, recent] = await Promise.all([
    prisma.lead.count({ where: inPeriod }),
    prisma.lead.groupBy({ by: ["stageId"], where: inPeriod, _count: true }),
    prisma.lead.findMany({ where: { AND: [openScope, { stage: { isInitial: true } }] }, select: { stage: { select: { isInitial: true } }, firstContactedAt: true, assignedAt: true } }),
    prisma.task.findMany({
      where: { status: "OPEN", type: { in: ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP"] }, dueAt: { lt: now }, lead: scope },
      select: { assignee: { select: { name: true } } },
    }),
    prisma.lead.count({ where: { AND: [inPeriod, { locationStatus: "OUT_OF_AREA" }] } }),
    prisma.appointment.count({ where: { createdAt: { gte: from }, lead: scope } }),
    // "Pipeline value" = open leads in late stages (probability ≥ 50% in the stage master)
    prisma.lead.findMany({ where: { AND: [openScope, { stage: { probability: { gte: 50 } } }] }, select: { estimatedValueInr: true, orderValueInr: true } }),
    prisma.lead.aggregate({ where: { AND: [scope, { stage: { category: "WON" }, stageChangedAt: { gte: from } }] }, _sum: { orderValueInr: true }, _count: true }),
    prisma.lead.groupBy({ by: ["sourceId"], where: { AND: [scope, { createdAt: { gte: thirty } }] }, _count: true }),
    prisma.lead.groupBy({ by: ["stageId"], where: { AND: [openScope, { pipelineId: funnelPipeline.id }] }, _count: true }),
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

  const [prevNewLeads, prevCohort, prevVisits, prevWon, trendLeads, trendVisits, openLeads, closed] = await Promise.all([
    prisma.lead.count({ where: { AND: [scope, { createdAt: inPrevPeriod }] } }),
    prisma.lead.groupBy({ by: ["stageId"], where: { AND: [scope, { createdAt: inPrevPeriod }] }, _count: true }),
    prisma.appointment.count({ where: { createdAt: inPrevPeriod, lead: scope } }),
    prisma.lead.aggregate({ where: { AND: [scope, { stage: { category: "WON" }, stageChangedAt: inPrevPeriod }] }, _sum: { orderValueInr: true }, _count: true }),
    prisma.lead.findMany({ where: { AND: [scope, { createdAt: { gte: trendFrom } }] }, select: { createdAt: true, stageId: true, estimatedValueInr: true, orderValueInr: true } }),
    prisma.appointment.findMany({ where: { createdAt: { gte: trendFrom }, lead: scope }, select: { createdAt: true } }),
    prisma.lead.findMany({ where: openScope, select: { stageId: true, ownerId: true, estimatedValueInr: true, orderValueInr: true, owner: { select: { name: true } } } }),
    prisma.lead.findMany({
      where: { AND: [scope, { stage: { category: { in: ["WON", "LOST"] } }, stageChangedAt: { gte: historyFrom } }] },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stageId: true,
        stageChangedAt: true,
        estimatedValueInr: true,
        orderValueInr: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
    }),
  ]);

  const catOf = (stageId: string) => masters.stageById.get(stageId)?.category;
  const wonN = cohort.filter((c) => catOf(c.stageId) === "WON").reduce((n, c) => n + c._count, 0);
  const lostN = cohort.filter((c) => catOf(c.stageId) === "LOST").reduce((n, c) => n + c._count, 0);
  const prevWonN = prevCohort.filter((c) => catOf(c.stageId) === "WON").reduce((n, c) => n + c._count, 0);
  const prevLostN = prevCohort.filter((c) => catOf(c.stageId) === "LOST").reduce((n, c) => n + c._count, 0);
  const sourceRows = bySource.map((s) => ({ label: masters.sourceById.get(s.sourceId)?.name ?? "—", value: s._count })).sort((a, b) => b.value - a.value);
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

  const wonValueNow = won._sum.orderValueInr ?? 0;
  const prevWonValue = prevWon._sum.orderValueInr ?? 0;
  const avgDeal = won._count ? Math.round(wonValueNow / won._count) : null;
  const prevAvgDeal = prevWon._count ? Math.round(prevWonValue / prevWon._count) : null;
  const conversion = conversionPct(wonN, lostN);
  const prevConversion = conversionPct(prevWonN, prevLostN);

  const closedRows = closed.map((l) => ({ ...l, category: catOf(l.stageId) }));
  const wonRows = closedRows.filter((l) => l.category === "WON");
  const inThisPeriod = closedRows.filter((l) => l.stageChangedAt >= from);
  const topDeals = (category: "WON" | "LOST", value: (l: (typeof closedRows)[number]) => number) =>
    inThisPeriod
      .filter((l) => l.category === category)
      .map((l) => ({
        id: l.id,
        name: [l.firstName, l.lastName].filter(Boolean).join(" "),
        owner: l.owner?.name ?? "Unassigned",
        stage: shortLabel(masters.stageById.get(l.stageId)?.label ?? ""),
        value: value(l),
        date: l.stageChangedAt,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_DEALS);

  const weeksOfLeads = weeklyGroups(trendLeads, (l) => l.createdAt, now, TREND_WEEKS);
  const weeksOfWins = weeklyGroups(wonRows, (l) => l.stageChangedAt, now, TREND_WEEKS);
  const weeksOfVisits = weeklyGroups(trendVisits, (a) => a.createdAt, now, TREND_WEEKS);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // Won value by IST month; the months after the current one carry the run-rate forecast
  const currentMonth = formatIST(now, "yyyy-MM");
  const wonByMonth = new Map<string, number>();
  for (const l of wonRows) {
    const key = formatIST(l.stageChangedAt, "yyyy-MM");
    wonByMonth.set(key, (wonByMonth.get(key) ?? 0) + wonValue(l));
  }
  const ninety = startOfIstDay(now, -89);
  const runRate = monthlyRunRate(sum(wonRows.filter((l) => l.stageChangedAt >= ninety).map(wonValue)));
  const firstActual = months.findIndex((m) => wonByMonth.has(m.key));
  const forecast = months.slice(Math.max(firstActual, 0)).map((m) => {
    const future = m.key > currentMonth;
    const actual = wonByMonth.get(m.key) ?? 0;
    return { label: m.label, actual: future ? null : actual, forecast: future ? runRate : m.key === currentMonth ? actual : null };
  });

  const people = new Map<string, { name: string; open: number; value: number; won: number; lost: number }>();
  const person = (id: string, name: string) => {
    if (!people.has(id)) people.set(id, { name, open: 0, value: 0, won: 0, lost: 0 });
    return people.get(id)!;
  };
  for (const l of openLeads) {
    if (!l.ownerId || !l.owner) continue;
    const p = person(l.ownerId, l.owner.name);
    p.open++;
    p.value += leadValue(l);
  }
  for (const l of inThisPeriod) {
    if (!l.ownerId || !l.owner) continue;
    const p = person(l.ownerId, l.owner.name);
    if (l.category === "WON") p.won++;
    else p.lost++;
  }

  const funnelStages = openStages(masters.stages, funnelPipeline.id);
  const funnelCounts = funnelStages.map((s) => byStage.find((x) => x.stageId === s.id)?._count ?? 0);
  const funnelReached = reachedCounts(funnelCounts);

  return {
    kpis: {
      newLeads,
      uncontacted: newOpen.filter((l) => isSlaBreached(l, settings.sla.firstContactMins, settings.workingHours, now)).length,
      overdue: overdueTasks.length,
      outOfArea: ooa,
      visits,
      pipelineValue: pipeline.reduce((s, l) => s + (l.estimatedValueInr ?? l.orderValueInr ?? 0), 0),
      lateLeads: pipeline.length,
      wonValue: wonValueNow,
      wonCount: won._count,
      conversion,
      conversionBase: wonN + lostN,
      avgDeal,
    },
    // Change against the same length of time just before this period
    deltas: {
      newLeads: pctChange(newLeads, prevNewLeads),
      visits: pctChange(visits, prevVisits),
      wonValue: pctChange(wonValueNow, prevWonValue),
      avgDeal: avgDeal != null && prevAvgDeal != null ? pctChange(avgDeal, prevAvgDeal) : null,
      conversion: conversion != null && prevConversion != null ? conversion - prevConversion : null,
    },
    trends: {
      newLeads: weeksOfLeads.map((w) => ({ label: w.label, value: w.items.length })),
      visits: weeksOfVisits.map((w) => ({ label: w.label, value: w.items.length })),
      wonValue: weeksOfWins.map((w) => ({ label: w.label, value: sum(w.items.map(wonValue)) })),
      avgDeal: weeksOfWins.map((w) => ({ label: w.label, value: w.items.length ? Math.round(sum(w.items.map(wonValue)) / w.items.length) : null })),
      conversion: weeksOfLeads.map((w) => {
        const closedN = w.items.filter((l) => catOf(l.stageId) !== "OPEN").length;
        return { label: w.label, value: closedN ? Math.round((w.items.filter((l) => catOf(l.stageId) === "WON").length / closedN) * 100) : null };
      }),
    },
    outcomes: { open: newLeads - wonN - lostN, won: wonN, lost: lostN },
    newValueByWeek: weeksOfLeads.map((w) => ({ label: w.label, value: sum(w.items.map(leadValue)) })),
    forecast,
    runRate,
    weightedPipeline: Math.round(sum(openLeads.map((l) => (leadValue(l) * (masters.stageById.get(l.stageId)?.probability ?? 0)) / 100))),
    salespeople: showPeople
      ? [...people.values()]
          .sort((a, b) => b.value - a.value)
          .slice(0, TOP_PEOPLE)
          .map((p) => ({ ...p, winRate: conversionPct(p.won, p.lost) }))
      : null,
    topWon: topDeals("WON", wonValue),
    topLost: topDeals("LOST", leadValue),
    pipeline: { id: funnelPipeline.id, name: funnelPipeline.name },
    pipelines: masters.pipelines.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name })),
    funnel: funnelStages.map((s, i) => ({
      label: shortLabel(s.label),
      value: funnelCounts[i],
      reached: funnelReached[i],
      color: s.color,
      amount: sum(openLeads.filter((l) => l.stageId === s.id).map(leadValue)),
    })),
    // The biggest source is highlighted
    sources: sourceRows.map((s, i) => ({ ...s, highlight: i === 0 })),
    branches: [...branchCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    daily: days.map(({ label, value }) => ({ label, value })),
    overdueByRep: [...overdueByRep.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    responseTimes: [...responseByBranch.entries()]
      .filter(([n]) => n !== "—")
      .map(([label, xs]) => ({ label, value: Math.round(median(xs) ?? 0) }))
      .sort((a, b) => a.value - b.value),
    attention,
    recent,
  };
}
