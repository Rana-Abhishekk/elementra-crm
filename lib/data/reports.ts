// The client's three Executive Summary pivots, rebuilt live (02_REFERENCE_DATA §12).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadWhereForUser } from "@/lib/access";
import type { SessionUser } from "@/lib/auth";
import { LOST_REASON_LABEL, STAGE_ORDER, stageLabel } from "@/lib/domain/stages";
import { PRODUCT_LABEL, SOURCE_LABEL } from "@/lib/domain/labels";
import { shortBranch } from "@/lib/domain/routing/decide";
import { formatIST, startOfIstDay } from "@/lib/domain/time";

export interface ReportFilters {
  from: Date;
  to: Date;
  branchId?: string;
}

export function parseReportFilters(sp: Record<string, string | undefined>, now = new Date()): ReportFilters & { fromStr: string; toStr: string } {
  const fromStr = sp.from ?? formatIST(startOfIstDay(now, -89), "yyyy-MM-dd");
  const toStr = sp.to ?? formatIST(now, "yyyy-MM-dd");
  return { from: new Date(`${fromStr}T00:00:00+05:30`), to: new Date(`${toStr}T23:59:59+05:30`), branchId: sp.branch || undefined, fromStr, toStr };
}

export async function reportsData(user: SessionUser, f: ReportFilters) {
  const where: Prisma.LeadWhereInput = {
    AND: [leadWhereForUser(user), { createdAt: { gte: f.from, lte: f.to } }, f.branchId ? { branchId: f.branchId } : {}],
  };
  const leads = await prisma.lead.findMany({
    where,
    select: {
      createdAt: true,
      stage: true,
      lostReason: true,
      products: true,
      source: true,
      locationStatus: true,
      orderValueInr: true,
      branch: { select: { name: true, kind: true } },
      owner: { select: { name: true } },
    },
  });

  // A. Status × Product by month (product cell joined like the sheet: "Kitchen, Wardrobes")
  const monthKeys = [...new Set(leads.map((l) => formatIST(l.createdAt, "yyyy-MM")))].sort();
  const months = monthKeys.map((k) => ({ key: k, label: formatIST(new Date(`${k}-15T12:00:00+05:30`), "MMM yyyy") }));
  const statusKey = (l: (typeof leads)[number]) => stageLabel(l.stage, l.lostReason);
  const statusOrder = [
    ...STAGE_ORDER.filter((s) => s !== "CLOSED_LOST").map((s) => stageLabel(s)),
    ...Object.keys(LOST_REASON_LABEL).map((r) => stageLabel("CLOSED_LOST", r as keyof typeof LOST_REASON_LABEL)),
  ];
  const pivotA: { status: string; product: string; byMonth: Record<string, number>; total: number }[] = [];
  for (const l of leads) {
    const product = l.products.length ? l.products.map((p) => PRODUCT_LABEL[p]).join(", ") : "Others";
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
  const handoverOrder = ["Worli", "Andheri", "Tardeo", "Pune", "Out of area", "Needs location"];
  const handover = new Map(handoverOrder.map((k) => [k, 0]));
  for (const l of leads) {
    const key = l.locationStatus === "OUT_OF_AREA" ? "Out of area" : l.locationStatus === "NEEDS_LOCATION" || l.branch?.kind === "ONLINE_DESK" ? "Needs location" : l.branch ? shortBranch(l.branch.name) : "Needs location";
    handover.set(key, (handover.get(key) ?? 0) + 1);
  }

  // C. Order value by branch × rep (won)
  const orderRows = new Map<string, Map<string, number>>();
  for (const l of leads.filter((x) => x.stage === "CLOSED_WON")) {
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
  const sources = [...new Set(leads.map((l) => l.source))];
  const conversion = sources
    .map((s) => {
      const ls = leads.filter((l) => l.source === s);
      const won = ls.filter((l) => l.stage === "CLOSED_WON").length;
      const lost = ls.filter((l) => l.stage === "CLOSED_LOST").length;
      const qualified = ls.filter((l) => STAGE_ORDER.indexOf(l.stage) >= STAGE_ORDER.indexOf("QUALIFIED") && l.stage !== "CLOSED_LOST").length;
      return { source: SOURCE_LABEL[s], leads: ls.length, qualified, won, lost, rate: won + lost >= 5 ? Math.round((won / (won + lost)) * 100) : null };
    })
    .sort((a, b) => b.leads - a.leads);

  const lostReasons = Object.entries(LOST_REASON_LABEL)
    .map(([r, label]) => ({ label, value: leads.filter((l) => l.lostReason === r).length }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return { total: leads.length, months, statusTotals, handover: [...handover.entries()].map(([label, value]) => ({ label, value })), pivotC, conversion, lostReasons };
}
