import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { dashboardData, PERIODS, type Period } from "@/lib/data/dashboard";
import { Card, CardHeader, PageHeader, Stat, Tabs } from "@/components/ui";
import { DailyBars, HBars, VIZ } from "@/components/charts";
import { ACTIVITY_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { formatLakh } from "@/lib/domain/money";
import { formatIST, relativeTime } from "@/lib/domain/time";

const mins = (m: number) => (m < 60 ? `${m} min` : `${(m / 60).toFixed(1).replace(/\.0$/, "")} h`);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; denied?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const period = (PERIODS.some((p) => p.key === sp.period) ? sp.period : "30d") as Period;
  const d = await dashboardData(user, period);
  const manager = user.scope !== "OWN";
  const now = new Date();
  const k = d.kpis;

  return (
    <div className="mx-auto max-w-7xl">
      {sp.denied && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">That page isn&apos;t available for your role, so you&apos;re back on the dashboard.</div>
      )}
      <PageHeader
        title={manager ? "Dashboard" : "My numbers"}
        description={`As of ${formatIST(now, "EEE d MMM, h:mm a")} IST${user.scope === "BRANCH" ? ` · your branch${user.branchIds.length > 1 ? "es" : ""}` : ""}`}
      />
      <Tabs active={period} tabs={PERIODS.map((p) => ({ key: p.key, label: p.label, href: `?period=${p.key}` }))} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New leads" value={k.newLeads} />
        <Stat label="Uncontacted > SLA" value={k.uncontacted} tone={k.uncontacted ? "red" : undefined} hint="Not called within 1 working hour" />
        <Stat label="Overdue follow-ups" value={k.overdue} tone={k.overdue ? "red" : undefined} hint="Right now" />
        <Stat label="Out of area" value={k.outOfArea} />
        <Stat label="Showroom visits booked" value={k.visits} />
        <Stat label="Pipeline value" value={formatLakh(k.pipelineValue)} hint="Quotation sent and later" />
        <Stat label="Won value" value={formatLakh(k.wonValue)} tone={k.wonValue ? "green" : undefined} hint={`${k.wonCount} deal${k.wonCount === 1 ? "" : "s"}`} />
        <Stat label="Conversion" value={k.conversion == null ? "n/a" : `${k.conversion}%`} hint={k.conversion == null ? "Fewer than 5 closed leads" : `Won ÷ closed, ${k.conversionBase} closed`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Open pipeline by stage" action={<Link href="/dashboard/pipeline" className="text-xs text-brand hover:underline">Pipeline →</Link>} />
          <div className="p-4">
            <HBars data={d.funnel.map((f) => ({ ...f, display: String(f.value) }))} valueLabel="Open leads" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Overdue follow-ups by person" />
          <div className="p-4">
            {d.overdueByRep.length ? (
              <HBars data={d.overdueByRep.map((r) => ({ ...r, display: String(r.value) }))} valueLabel="Overdue tasks" color={VIZ.critical} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">Nobody has overdue follow-ups. 👏</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Leads by source · last 30 days" />
          <div className="p-4">
            <HBars data={d.sources.map((s) => ({ ...s, display: String(s.value) }))} valueLabel="Leads" emphasis labelWidth={140} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Where leads went · last 30 days" />
          <div className="p-4">
            <HBars data={d.branches.map((b) => ({ ...b, display: String(b.value) }))} valueLabel="Leads" />
          </div>
        </Card>
        <Card>
          <CardHeader title="New leads per day · last 30 days" />
          <div className="p-4">
            <DailyBars data={d.daily} valueLabel="New leads" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Median first response by branch · working time" />
          <div className="p-4">
            {d.responseTimes.length ? (
              <HBars data={d.responseTimes.map((r) => ({ ...r, display: mins(r.value) }))} valueLabel="Median first response" />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No contacted leads yet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-1.5"><AlertTriangle className="size-4 text-rose-500" /> Needs attention now</span>} />
          <div className="divide-y divide-slate-100">
            {d.attention.map((t) => (
              <Link key={t.id} href={t.lead ? `/dashboard/leads/${t.lead.id}` : "/dashboard/my-day"} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{t.title}</div>
                  <div className="text-xs text-slate-500">
                    {TASK_TYPE_LABEL[t.type]} · {t.assignee.name} · {t.lead?.refCode}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-rose-600">{relativeTime(t.dueAt, now).replace(" ago", "")} overdue</span>
              </Link>
            ))}
            {d.attention.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing overdue. </p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <div className="divide-y divide-slate-100">
            {d.recent.map((a) => (
              <Link key={a.id} href={`/dashboard/leads/${a.lead!.id}`} className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-ink">
                    <span className="font-medium">{a.lead!.firstName} {a.lead!.lastName}</span> · {a.body.split("\n")[0]}
                  </div>
                  <div className="text-xs text-slate-500">
                    {ACTIVITY_LABEL[a.type]} · {a.user?.name ?? "Elementra CRM"} · {relativeTime(a.createdAt, now)}
                  </div>
                </div>
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
