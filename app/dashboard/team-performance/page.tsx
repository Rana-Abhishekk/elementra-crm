import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { userWhere, visibleBranchIds } from "@/lib/auth/scope";
import { getSettings } from "@/lib/data/settings";
import { Card, Chip, PageHeader } from "@/components/ui";
import { formatLakh } from "@/lib/domain/money";
import { shortBranch } from "@/lib/domain/routing/decide";
import { formatIST, startOfIstDay, workingMinutesBetween } from "@/lib/domain/time";
import { cn } from "@/lib/utils";

interface Stats {
  open: number;
  newWeek: number;
  slaHit: number;
  slaBase: number;
  overdue: number;
  visits: number;
  wonCount: number;
  wonValue: number;
  actionsToday: number;
}
const empty = (): Stats => ({ open: 0, newWeek: 0, slaHit: 0, slaBase: 0, overdue: 0, visits: 0, wonCount: 0, wonValue: 0, actionsToday: 0 });
const add = (a: Stats, b: Stats): Stats => Object.fromEntries(Object.keys(a).map((k) => [k, a[k as keyof Stats] + b[k as keyof Stats]])) as unknown as Stats;

// One row per branch (managers + team totals), expandable to each person (06 §5.6)
export default async function TeamPerformancePage() {
  const actor = await requirePagePermission("team.performance");
  const now = new Date();
  const week = startOfIstDay(now, -6);
  const month = startOfIstDay(now, -29);
  const today = startOfIstDay(now);
  const settings = await getSettings();
  const ids = visibleBranchIds(actor);
  const [branches, people] = await Promise.all([
    prisma.branch.findMany({ where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({
      where: { AND: [userWhere(actor), { isActive: true }] },
      select: { id: true, name: true, branchId: true, lastLoginAt: true, role: { select: { name: true, scope: true, isLocked: true } }, extraBranches: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const uids = people.map((p) => p.id);
  const [open, newWeek, contacted, overdue, visits, won, actions] = await Promise.all([
    prisma.lead.groupBy({ by: ["ownerId"], where: { ownerId: { in: uids }, stage: { category: "OPEN" } }, _count: true }),
    prisma.lead.groupBy({ by: ["ownerId"], where: { ownerId: { in: uids }, assignedAt: { gte: week } }, _count: true }),
    prisma.lead.findMany({ where: { ownerId: { in: uids }, assignedAt: { gte: month } }, select: { ownerId: true, assignedAt: true, firstContactedAt: true } }),
    prisma.task.groupBy({ by: ["assigneeId"], where: { assigneeId: { in: uids }, status: "OPEN", dueAt: { lt: now }, type: { in: ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP"] } }, _count: true }),
    prisma.appointment.groupBy({ by: ["hostId"], where: { hostId: { in: uids }, createdAt: { gte: week } }, _count: true }),
    prisma.lead.groupBy({ by: ["ownerId"], where: { ownerId: { in: uids }, stage: { category: "WON" }, stageChangedAt: { gte: month } }, _count: true, _sum: { orderValueInr: true } }),
    prisma.activity.groupBy({ by: ["userId"], where: { userId: { in: uids }, createdAt: { gte: today } }, _count: true }),
  ]);
  const stats = new Map<string, Stats>(uids.map((id) => [id, empty()]));
  const s = (id: string | null) => (id ? stats.get(id) : undefined);
  const put = (id: string | null, patch: Partial<Stats>) => {
    const st = s(id);
    if (st) Object.assign(st, patch);
  };
  for (const r of open) put(r.ownerId, { open: r._count });
  for (const r of newWeek) put(r.ownerId, { newWeek: r._count });
  for (const r of overdue) put(r.assigneeId, { overdue: r._count });
  for (const r of visits) put(r.hostId, { visits: r._count });
  for (const r of won) put(r.ownerId, { wonCount: r._count, wonValue: r._sum.orderValueInr ?? 0 });
  for (const r of actions) put(r.userId, { actionsToday: r._count });
  for (const l of contacted) {
    const st = s(l.ownerId);
    if (!st || !l.assignedAt) continue;
    st.slaBase++;
    if (l.firstContactedAt && workingMinutesBetween(l.assignedAt, l.firstContactedAt, settings.workingHours) <= settings.sla.firstContactMins) st.slaHit++;
  }

  const groups = branches.map((b) => {
    const members = people.filter((p) => p.branchId === b.id);
    const managers = people.filter((p) => p.role.scope === "BRANCH" && (p.branchId === b.id || p.extraBranches.some((x) => x.id === b.id)));
    const team = members.filter((p) => p.role.scope !== "BRANCH");
    const total = members.reduce((acc, p) => add(acc, stats.get(p.id)!), empty());
    return { branch: b, managers, team: [...managers.filter((m) => m.branchId === b.id), ...team], total };
  });
  const pct = (st: Stats) => (st.slaBase ? `${Math.round((st.slaHit / st.slaBase) * 100)}%` : "—");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Team performance"
        description={`${actor.scope === "ALL" ? "Every branch" : "Your branches"}: who's carrying what, how fast first calls happen and what's converting. Click a person to see their activity.`}
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Branch / person</th>
              <th className="p-3 text-right">Open leads</th>
              <th className="p-3 text-right">New (7 d)</th>
              <th className="p-3 text-right" title={`First call within ${settings.sla.firstContactMins} working minutes, last 30 days`}>
                First call in SLA
              </th>
              <th className="p-3 text-right">Overdue follow-ups</th>
              <th className="p-3 text-right">Visits booked (7 d)</th>
              <th className="p-3 text-right">Won (30 d)</th>
              <th className="p-3">Last sign-in</th>
              <th className="p-3 text-right">Actions today</th>
            </tr>
          </thead>
          {groups.map(({ branch, managers, team, total }) => (
            <tbody key={branch.id} className="border-t-4 border-slate-100">
              <tr className="bg-slate-50/60">
                <td className="p-3">
                  <div className="font-semibold text-ink">{branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(branch.name)}</div>
                  <div className="text-xs text-slate-500">Managed by {managers.length ? managers.map((m) => m.name).join(", ") : "—"}</div>
                </td>
                <Cells st={total} pct={pct(total)} bold />
                <td />
                <td className="p-3 text-right font-semibold">{total.actionsToday}</td>
              </tr>
              {team.map((p) => {
                const st = stats.get(p.id)!;
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3 pl-6">
                      <Link href={`/dashboard/audit?actor=${p.id}`} className="font-medium text-ink hover:underline">
                        {p.name}
                      </Link>
                      <Chip className="ml-2 text-[10px]">{p.role.name}</Chip>
                    </td>
                    <Cells st={st} pct={pct(st)} />
                    <td className="p-3 text-xs text-slate-500">{p.lastLoginAt ? formatIST(p.lastLoginAt, "d MMM, h:mm a") : "Never"}</td>
                    <td className={cn("p-3 text-right", st.actionsToday === 0 && "text-slate-400")}>{st.actionsToday}</td>
                  </tr>
                );
              })}
              {team.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-3 pl-6 text-xs text-slate-500">
                    Nobody in this branch yet.
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </Card>
    </div>
  );
}

function Cells({ st, pct, bold }: { st: Stats; pct: string; bold?: boolean }) {
  const c = cn("p-3 text-right tabular-nums", bold && "font-semibold");
  return (
    <>
      <td className={c}>{st.open}</td>
      <td className={c}>{st.newWeek}</td>
      <td className={c}>{pct}</td>
      <td className={cn(c, st.overdue > 0 && "text-rose-600")}>{st.overdue}</td>
      <td className={c}>{st.visits}</td>
      <td className={c}>
        {st.wonCount}
        {st.wonValue ? <span className="ml-1 text-xs text-slate-500">· {formatLakh(st.wonValue)}</span> : null}
      </td>
    </>
  );
}
