import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePagePermission } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { assignableUsers } from "@/lib/data/leads";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import { SourceBadge } from "@/components/lead-badges";
import { formatPhone } from "@/lib/domain/phone";
import { relativeTime } from "@/lib/domain/time";
import { JUST_OUTSIDE_KM, shortBranch, type Candidate } from "@/lib/domain/routing/decide";
import { CaptureLocation, OutOfAreaActions, AssignUnassigned } from "./queue-actions";

type SP = Promise<{ tab?: string }>;

export default async function QueuesPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePagePermission("queues.needsLocation", "queues.outOfArea", "leads.reassign");
  // Each queue tab needs its own permission
  const allowed = [
    can(user, "queues.needsLocation") && "needs-location",
    can(user, "queues.outOfArea") && "out-of-area",
    can(user, "leads.reassign") && "unassigned",
  ].filter(Boolean) as string[];
  const requested = (await searchParams).tab;
  const tab = requested && allowed.includes(requested) ? requested : allowed[0];
  const manager = can(user, "queues.outOfArea");
  const scope = leadWhere(user);
  const open = { stage: { category: "OPEN" as const } };

  const [needs, outOfArea, unassigned] = await Promise.all([
    prisma.lead.count({ where: { AND: [scope, open, { locationStatus: "NEEDS_LOCATION" }] } }),
    prisma.lead.count({ where: { AND: [scope, open, { locationStatus: "OUT_OF_AREA" }] } }),
    prisma.lead.count({ where: { AND: [scope, open, { ownerId: null, locationStatus: "RESOLVED" }] } }),
  ]);
  const where =
    tab === "out-of-area"
      ? { locationStatus: "OUT_OF_AREA" as const }
      : tab === "unassigned"
        ? { ownerId: null, locationStatus: "RESOLVED" as const }
        : { locationStatus: "NEEDS_LOCATION" as const };
  const leads = await prisma.lead.findMany({
    where: { AND: [scope, open, where] },
    include: { owner: { select: { name: true } }, branch: { select: { name: true } }, source: { select: { name: true, color: true, isActive: true } }, routingDecisions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // Accept-for-branch targets: only branches the manager covers (all for ALL scope)
  const branches = manager
    ? await prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE", isActive: true, ...(user.scope === "ALL" ? {} : { id: { in: user.branchIds } }) }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  const people = tab === "unassigned" ? await assignableUsers(user) : [];
  const now = new Date();

  const tabs = [
    { key: "needs-location", label: `Needs location (${needs})`, href: "?tab=needs-location" },
    { key: "out-of-area", label: `Out of area (${outOfArea})`, href: "?tab=out-of-area" },
    { key: "unassigned", label: `Unassigned (${unassigned})`, href: "?tab=unassigned" },
  ].filter((t) => allowed.includes(t.key));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Queues"
        description={
          tab === "needs-location"
            ? "Leads without a usable site location. Call the customer, type the area or pincode — the lead is handed over to the right branch instantly."
            : tab === "out-of-area"
              ? "Enquiries outside every branch's service radius. Serve one from a branch anyway, decline politely on WhatsApp, or close it."
              : "Routed leads where nobody in the branch was available."
        }
      />
      <Tabs active={tab} tabs={tabs} />
      {leads.length === 0 ? (
        <div className="card">
          <EmptyState icon={CheckCircle2} title="Queue is clear">
            Nothing waiting here right now.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const d = l.routingDecisions[0];
            const nearest = ((d?.candidates as Candidate[] | null) ?? [])[0];
            const justOutside = nearest && nearest.distanceKm <= nearest.radiusKm + JUST_OUTSIDE_KM;
            return (
              <div key={l.id} className="card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceBadge source={l.source} />
                      <Link href={`/dashboard/leads/${l.id}`} className="font-medium text-ink hover:underline">
                        {l.firstName} {l.lastName}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {l.refCode} · {relativeTime(l.createdAt, now)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {l.siteAddressRaw ? <>“{l.siteAddressRaw}”</> : <span className="text-slate-400">No address given</span>}
                      {l.phoneE164 && <span className="text-slate-400"> · {formatPhone(l.phoneE164)}</span>}
                    </div>
                    {tab === "out-of-area" && (
                      <div className="mt-1 text-sm">
                        {nearest ? (
                          <span className={justOutside ? "font-medium text-amber-700" : "text-rose-700"}>
                            {nearest.distanceKm.toFixed(1)} km from {nearest.name} (radius {nearest.radiusKm} km){justOutside ? " · Just outside radius" : ""}
                          </span>
                        ) : (
                          <span className="text-rose-700">{d?.explanation[0] ?? "Outside the service area"}</span>
                        )}
                      </div>
                    )}
                    {tab === "needs-location" && <div className="mt-1 text-xs text-slate-500">With {l.owner?.name ?? "Online Desk"}</div>}
                    {tab === "unassigned" && <div className="mt-1 text-xs text-slate-500">Branch: {l.branch ? shortBranch(l.branch.name) : "—"}</div>}
                  </div>
                  <div className="md:w-96 md:shrink-0">
                    {tab === "needs-location" && <CaptureLocation leadId={l.id} />}
                    {tab === "out-of-area" && <OutOfAreaActions leadId={l.id} branches={branches.map((b) => ({ id: b.id, name: shortBranch(b.name) }))} defaultBranchId={nearest?.branchId ?? branches[0]?.id} hasPhone={!!l.phoneE164} />}
                    {tab === "unassigned" && <AssignUnassigned leadId={l.id} people={people.map((p) => ({ id: p.id, name: p.name, branch: p.branch ? shortBranch(p.branch.name) : "" }))} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
