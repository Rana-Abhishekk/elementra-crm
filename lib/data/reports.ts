// The client's three Executive Summary pivots, rebuilt live (02_REFERENCE_DATA §12).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { getMasters } from "@/lib/data/masters";
import { pipelineStages } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { formatIST, startOfIstDay } from "@/lib/domain/time";

export interface ReportFilters {
  from: Date;
  to: Date;
  branchId?: string;
  pipelineId?: string;
}

export function parseReportFilters(sp: Record<string, string | undefined>, now = new Date()): ReportFilters & { fromStr: string; toStr: string } {
  const fromStr = sp.from ?? formatIST(startOfIstDay(now, -89), "yyyy-MM-dd");
  const toStr = sp.to ?? formatIST(now, "yyyy-MM-dd");
  return { from: new Date(`${fromStr}T00:00:00+05:30`), to: new Date(`${toStr}T23:59:59+05:30`), branchId: sp.branch || undefined, pipelineId: sp.pipeline || undefined, fromStr, toStr };
}

export async function reportsData(user: Pick<CurrentUser, "id" | "scope" | "branchIds" | "permissions">, f: ReportFilters) {
  const masters = await getMasters();
  const pipeline = (f.pipelineId && masters.pipelineById.get(f.pipelineId)) || masters.defaultPipeline;
  // Every stage of the pipeline (inactive ones too, so old leads still count), in the admin's order
  const stages = pipelineStages(masters.stages, pipeline.id, { includeInactive: true });
  const where: Prisma.LeadWhereInput = {
    AND: [leadWhere(user), { pipelineId: pipeline.id, createdAt: { gte: f.from, lte: f.to } }, f.branchId ? { branchId: f.branchId } : {}],
  };
  const [leads, branches] = await Promise.all([
    prisma.lead.findMany({
    where,
    select: {
      createdAt: true,
      stageId: true,
      products: { select: { name: true }, orderBy: { sortOrder: "asc" } },
      sourceId: true,
      locationStatus: true,
      orderValueInr: true,
      branch: { select: { name: true, kind: true } },
      owner: { select: { name: true } },
    },
  }),
    prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE", isActive: true }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const stageOf = (id: string) => masters.stageById.get(id)!;

  // A. Status × Product by month (product cell joined like the sheet: "Kitchen, Wardrobes")
  const monthKeys = [...new Set(leads.map((l) => formatIST(l.createdAt, "yyyy-MM")))].sort();
  const months = monthKeys.map((k) => ({ key: k, label: formatIST(new Date(`${k}-15T12:00:00+05:30`), "MMM yyyy") }));
  const statusKey = (l: (typeof leads)[number]) => stageOf(l.stageId).label;
  const statusOrder = stages.map((s) => s.label);
  const pivotA: { status: string; product: string; byMonth: Record<string, number>; total: number }[] = [];
  for (const l of leads) {
    const product = l.products.length ? l.products.map((p) => p.name).join(", ") : "—";
    const status = statusKey(l);
    const m = formatIST(l.createdAt, "yyyy-MM");
    let row = pivotA.find((r) => r.status === status && r.product === product);
    if (!row) pivotA.push((row = { status, product, byMonth: {}, total: 0 }));
    row.byMonth[m] = (row.byMonth[m] ?? 0) + 1;
    row.total++;
  }
  pivotA.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || b.total - a.total);
  const statusTotals = statusOrder
    .map((status) => {
      const rows = pivotA.filter((r) => r.status === status);
      const byMonth: Record<string, number> = {};
      for (const r of rows) for (const [m, n] of Object.entries(r.byMonth)) byMonth[m] = (byMonth[m] ?? 0) + n;
      return { status, rows, byMonth, total: rows.reduce((s, r) => s + r.total, 0) };
    })
    .filter((g) => g.total > 0);

  // B. Handover by branch
  const handoverOrder = [...branches.map((b) => shortBranch(b.name)), "Out of area", "Needs location"];
  const handover = new Map(handoverOrder.map((k) => [k, 0]));
  for (const l of leads) {
    const key = l.locationStatus === "OUT_OF_AREA" ? "Out of area" : l.locationStatus === "NEEDS_LOCATION" || l.branch?.kind === "ONLINE_DESK" ? "Needs location" : l.branch ? shortBranch(l.branch.name) : "Needs location";
    handover.set(key, (handover.get(key) ?? 0) + 1);
  }

  // C. Order value by branch × rep (won)
  const orderRows = new Map<string, Map<string, number>>();
  for (const l of leads.filter((x) => stageOf(x.stageId).category === "WON")) {
    const b = l.branch ? shortBranch(l.branch.name) : "—";
    const rep = l.owner?.name ?? "Unassigned";
    const m = orderRows.get(b) ?? new Map<string, number>();
    m.set(rep, (m.get(rep) ?? 0) + (l.orderValueInr ?? 0));
    orderRows.set(b, m);
  }
  const pivotC = [...orderRows.entries()]
    .map(([branch, reps]) => ({ branch, reps: [...reps.entries()].map(([rep, value]) => ({ rep, value })).sort((a, b) => b.value - a.value), total: [...reps.values()].reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total);

  // Source × stage conversion
  // "Qualified" = reached a stage behind the qualification gate, or won
  const sources = [...new Set(leads.map((l) => l.sourceId))];
  const conversion = sources
    .map((s) => {
      const ls = leads.filter((l) => l.sourceId === s);
      const won = ls.filter((l) => stageOf(l.stageId).category === "WON").length;
      const lost = ls.filter((l) => stageOf(l.stageId).category === "LOST").length;
      const qualified = ls.filter((l) => {
        const st = stageOf(l.stageId);
        return st.category === "WON" || (st.category === "OPEN" && st.requiresQualification);
      }).length;
      return { source: masters.sourceById.get(s)?.name ?? "—", leads: ls.length, qualified, won, lost, rate: won + lost >= 5 ? Math.round((won / (won + lost)) * 100) : null };
    })
    .sort((a, b) => b.leads - a.leads);

  // Lost reasons = the pipeline's LOST stages
  const lostReasons = stages
    .filter((st) => st.category === "LOST")
    .map((st) => ({ label: st.label, value: leads.filter((l) => l.stageId === st.id).length }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return { pipeline: { id: pipeline.id, name: pipeline.name }, pipelines: masters.pipelines.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name })), total: leads.length, months, statusTotals, handover: [...handover.entries()].map(([label, value]) => ({ label, value })), pivotC, conversion, lostReasons };
}
