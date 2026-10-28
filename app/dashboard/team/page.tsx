import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/access";
import { getSettings } from "@/lib/data/settings";
import { FeatureBadge } from "@/components/feature-badge";
import { Card, Chip, PageHeader, Tabs } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { OPEN_STAGES } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { formatIST, startOfIstDay, workingMinutesBetween } from "@/lib/domain/time";
import { isOnLeave } from "@/lib/domain/routing/assign";
import { LeaveToggle, ReceivesToggle } from "./member-controls";

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
const fmtMins = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`);

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requirePageRole("OWNER", "ADMIN", "SALES_MANAGER");
  const tab = (await searchParams).tab === "leave" ? "leave" : "members";
  const now = new Date();
  const monthStart = new Date(`${formatIST(now, "yyyy-MM")}-01T00:00:00+05:30`);
  const [branches, users, settings] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], include: { _count: { select: { pincodeRules: true } } } }),
    prisma.user.findMany({ where: { isActive: true, role: { not: "ADMIN" } }, include: { branch: true }, orderBy: [{ branch: { name: "asc" } }, { role: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  const ids = users.map((u) => u.id);
  const [open, overdue, monthLeads, monthWon, responses] = await Promise.all([
    prisma.lead.groupBy({ by: ["ownerId"], where: { ownerId: { in: ids }, stage: { in: OPEN_STAGES } }, _count: true }),
    prisma.task.groupBy({ by: ["assigneeId"], where: { assigneeId: { in: ids }, status: "OPEN", dueAt: { lt: now }, type: { in: ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP"] } }, _count: true }),
    prisma.lead.groupBy({ by: ["ownerId"], where: { ownerId: { in: ids }, assignedAt: { gte: monthStart } }, _count: true }),
    prisma.lead.groupBy({ by: ["ownerId"], where: { ownerId: { in: ids }, stage: "CLOSED_WON", stageChangedAt: { gte: monthStart } }, _count: true, _sum: { orderValueInr: true } }),
    prisma.lead.findMany({ where: { ownerId: { in: ids }, firstContactedAt: { not: null }, createdAt: { gte: startOfIstDay(now, -29) } }, select: { ownerId: true, createdAt: true, firstContactedAt: true } }),
  ]);
  const count = (rows: { ownerId?: string | null; assigneeId?: string; _count: number }[], id: string) => rows.find((r) => (r.ownerId ?? r.assigneeId) === id)?._count ?? 0;
  const canEdit = (u: (typeof users)[number]) => actor.role !== "SALES_MANAGER" || u.branchId === actor.branchId;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Team" description="Who's in which branch, who's available, and how much each person is carrying. The on-leave toggle feeds straight into assignment." />
      <Tabs
        active={tab}
        tabs={[
          { key: "members", label: "Branches & members", href: "?tab=members" },
          { key: "leave", label: <span className="inline-flex items-center gap-1.5">Leave planner <FeatureBadge feature="F30" /></span>, href: "?tab=leave" },
        ]}
      />
      {tab === "members" ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {branches.map((b) => {
              const members = users.filter((u) => u.branchId === b.id);
              const away = members.filter((m) => isOnLeave(m, now)).length;
              return (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{b.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(b.name)}</span>
                    <span className="text-xs text-slate-400">{b.code}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{b.area}</div>
                  <div className="mt-3 space-y-0.5 text-xs text-slate-600">
                    {b.kind === "EXPERIENCE_CENTRE" && <div>Radius {b.serviceRadiusKm} km{b._count.pincodeRules ? ` · ${b._count.pincodeRules} pincode rules` : ""}</div>}
                    <div>{b.assignmentStrategy === "ROUND_ROBIN" ? "Round-robin" : "Fewest open leads"}</div>
                    <div>
                      {members.length} people{away ? <span className="text-amber-700"> · {away} on leave</span> : ""}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-left">Person</th>
                  <th className="p-3 text-left">Branch</th>
                  <th className="p-3 text-left">Gets new leads</th>
                  <th className="p-3 text-left">On leave</th>
                  <th className="p-3 text-right">Open leads</th>
                  <th className="p-3 text-right">Overdue</th>
                  <th className="p-3 text-right">Leads this month</th>
                  <th className="p-3 text-right">Won this month</th>
                  <th className="p-3 text-right">Median 1st response</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const won = monthWon.find((w) => w.ownerId === u.id);
                  const resp = median(responses.filter((r) => r.ownerId === u.id).map((r) => workingMinutesBetween(r.createdAt, r.firstContactedAt!, settings.workingHours)));
                  const od = count(overdue, u.id);
                  return (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="p-3">
                        <div className="font-medium text-ink">{u.name}</div>
                        <div className="text-xs text-slate-500">{ROLE_LABEL[u.role]}</div>
                      </td>
                      <td className="p-3">{u.branch ? (u.branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(u.branch.name)) : "—"}</td>
                      <td className="p-3">{u.role === "OWNER" ? <span className="text-xs text-slate-400">—</span> : <ReceivesToggle userId={u.id} value={u.receivesLeads} disabled={!canEdit(u)} />}</td>
                      <td className="p-3">{u.role === "OWNER" ? <span className="text-xs text-slate-400">—</span> : <LeaveToggle userId={u.id} onLeave={isOnLeave(u, now)} until={u.onLeaveUntil} disabled={!canEdit(u)} />}</td>
                      <td className="p-3 text-right">{count(open, u.id)}</td>
                      <td className="p-3 text-right">{od ? <Chip className="bg-rose-50 text-rose-700 ring-rose-200">{od}</Chip> : 0}</td>
                      <td className="p-3 text-right">{count(monthLeads, u.id)}</td>
                      <td className="p-3 text-right">{won ? `${won._count} · ₹${((won._sum.orderValueInr ?? 0) / 100000).toFixed(1)} L` : "—"}</td>
                      <td className="p-3 text-right">{fmtMins(resp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <LeavePlanner users={users.filter((u) => u.role !== "OWNER").map((u) => ({ id: u.id, name: u.name, onLeave: isOnLeave(u, now), until: u.onLeaveUntil }))} now={now} />
      )}
    </div>
  );
}

function LeavePlanner({ users, now }: { users: { id: string; name: string; onLeave: boolean; until: Date | null }[]; now: Date }) {
  const days = Array.from({ length: 14 }, (_, i) => startOfIstDay(now, i));
  return (
    <Card className="overflow-x-auto">
      <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
        Two-week view of who&apos;s away. Today it shows the on-leave toggle from the Members tab; planned leave requests, approvals and attendance come next.
      </div>
      <table className="w-full min-w-[800px] text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="p-2 text-left">Person</th>
            {days.map((d) => (
              <th key={d.toISOString()} className="p-2 text-center font-medium">
                {formatIST(d, "EEE")}
                <div className="font-normal text-slate-400">{formatIST(d, "d")}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="p-2 font-medium whitespace-nowrap text-ink">{u.name}</td>
              {days.map((d) => {
                const away = u.onLeave && (!u.until || d < u.until);
                return (
                  <td key={d.toISOString()} className="p-1">
                    <div className={away ? "h-6 rounded bg-amber-200" : "h-6 rounded bg-slate-50"} title={away ? "On leave" : "Available"} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
