import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { dashboardData, PERIODS, type Period } from "@/lib/data/dashboard";
import { Card, CardHeader, Tabs } from "@/components/ui";
import { DailyBars, ForecastChart, Funnel, HBars, OutcomeDonut, Sparkline, StageValueBars, ValueArea } from "@/components/charts";
import { ACTIVITY_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { formatLakh } from "@/lib/domain/money";
import { formatIST, relativeTime } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import { VIZ } from "@/lib/viz";

const mins = (m: number) => (m < 60 ? `${m} min` : `${(m / 60).toFixed(1).replace(/\.0$/, "")} h`);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const COMPARE_LABEL: Record<Period, string> = { today: "vs same time yesterday", "7d": "vs previous 7 days", "30d": "vs previous 30 days", month: "vs same stretch before" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; denied?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const period = (PERIODS.some((p) => p.key === sp.period) ? sp.period : "30d") as Period;
  const d = await dashboardData(user, period);
  const manager = user.scope !== "OWN";
  const now = new Date();
  const k = d.kpis;
  const compare = COMPARE_LABEL[period];

  return (
    <div>
      {sp.denied && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">That page isn&apos;t available for your role, so you&apos;re back on the dashboard.</div>
      )}
      <h1 className="sr-only">{manager ? "Dashboard" : "My numbers"}</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Tabs className="mb-0" active={period} tabs={PERIODS.map((p) => ({ key: p.key, label: p.label, href: `?period=${p.key}` }))} />
        <p className="text-sm text-slate-500">
          As of {formatIST(now, "EEE d MMM, h:mm a")} IST{user.scope === "BRANCH" ? ` · your branch${user.branchIds.length > 1 ? "es" : ""}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiTile label="New leads" value={k.newLeads} delta={d.deltas.newLeads} compare={compare} trend={d.trends.newLeads} />
        <KpiTile label="Showroom visits booked" value={k.visits} delta={d.deltas.visits} compare={compare} trend={d.trends.visits} />
        <KpiTile label="Pipeline value" value={formatLakh(k.pipelineValue)} note={`${k.lateLeads} lead${k.lateLeads === 1 ? "" : "s"}, quotation sent and later`} />
        <KpiTile label="Won value" value={formatLakh(k.wonValue)} delta={d.deltas.wonValue} compare={compare} note={`${k.wonCount} deal${k.wonCount === 1 ? "" : "s"}`} trend={d.trends.wonValue} money />
        <KpiTile
          label="Conversion"
          value={k.conversion == null ? "n/a" : `${k.conversion}%`}
          delta={d.deltas.conversion}
          deltaUnit="pts"
          compare={compare}
          note={k.conversion == null ? "Fewer than 5 closed leads" : `Won ÷ closed, ${k.conversionBase} closed`}
          trend={d.trends.conversion}
          percent
        />
        <KpiTile label="Avg. deal size" value={k.avgDeal == null ? "n/a" : formatLakh(k.avgDeal)} delta={d.deltas.avgDeal} compare={compare} trend={d.trends.avgDeal} money />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[6fr_4fr_3fr]">
        <Card>
          <CardHeader title="Pipeline analysis" action={<Link href="/dashboard/pipeline" className="text-xs text-brand hover:underline">Pipeline →</Link>} />
          <div className="grid items-center gap-4 p-4 pt-1 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
            <Funnel stages={d.funnel} />
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 font-medium">Stage</th>
                  <th className="py-1 text-right font-medium">Leads</th>
                  <th className="py-1 text-right font-medium">Est. value</th>
                </tr>
              </thead>
              <tbody>
                {d.funnel.map((s) => (
                  <tr key={s.label} className="text-slate-700">
                    <td className="w-full max-w-0 truncate py-1 pr-2" title={s.label}>
                      <span className="mr-1.5 inline-block size-2.5 rounded-sm align-[-1px]" style={{ background: s.color }} />
                      {s.label}
                    </td>
                    <td className="py-1 text-right tabular-nums">{s.value}</td>
                    <td className="py-1 text-right tabular-nums">{formatLakh(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-ink">
                  <td className="pt-1.5">Total</td>
                  <td className="pt-1.5 text-right tabular-nums">{d.funnel.reduce((n, s) => n + s.value, 0)}</td>
                  <td className="pt-1.5 text-right tabular-nums">{formatLakh(d.funnel.reduce((n, s) => n + s.amount, 0))}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-slate-500 sm:col-span-2">Funnel width = open leads at that stage or further along.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Estimated value by stage" />
          <div className="p-4 pt-1">
            <StageValueBars data={d.funnel.map((s) => ({ label: s.label, value: s.amount }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Lead outcomes" />
          <div className="p-4 pt-3">
            <OutcomeDonut
              center={k.conversion == null ? "n/a" : `${k.conversion}%`}
              caption="Conversion"
              segments={[
                { label: "Still open", value: d.outcomes.open, color: VIZ.series },
                { label: "Won", value: d.outcomes.won, color: VIZ.good },
                { label: "Lost", value: d.outcomes.lost, color: VIZ.critical },
              ]}
            />
            <p className="mt-3 text-center text-xs text-slate-500">Leads created in this period, by where they stand now.</p>
          </div>
        </Card>
      </div>

      <div className={cn("mt-4 grid gap-4", d.salespeople ? "xl:grid-cols-[3fr_4fr_3fr]" : "lg:grid-cols-2")}>
        <Card>
          <CardHeader title="Estimated value of new leads · by week" />
          <div className="p-4 pt-1">
            <ValueArea data={d.newValueByWeek} valueLabel="Estimated value" />
          </div>
        </Card>
        {d.salespeople && (
          <Card>
            <CardHeader title="Salesperson performance" action={<Link href="/dashboard/team-performance" className="text-xs text-brand hover:underline">Team →</Link>} />
            <div className="overflow-x-auto p-4 pt-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="py-1.5 font-medium">Salesperson</th>
                    <th className="py-1.5 text-right font-medium">Open</th>
                    <th className="py-1.5 text-right font-medium">Est. value</th>
                    <th className="py-1.5 text-right font-medium">Won</th>
                    <th className="py-1.5 text-right font-medium" title="Won ÷ closed in this period; n/a below 5 closed">Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.salespeople.map((p) => (
                    <tr key={p.name} className="text-slate-700">
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gold-light text-[11px] font-semibold text-brand">{initials(p.name)}</span>
                          <span className="whitespace-nowrap text-ink">{p.name}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{p.open}</td>
                      <td className="py-2 text-right whitespace-nowrap tabular-nums">{formatLakh(p.value)}</td>
                      <td className="py-2 text-right tabular-nums">{p.won}</td>
                      <td className="py-2 text-right tabular-nums">{p.winRate == null ? "n/a" : `${p.winRate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.salespeople.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No assigned leads yet.</p>}
            </div>
          </Card>
        )}
        <Card>
          <CardHeader title="Won value forecast" />
          <div className="p-4 pt-1">
            {d.forecast.some((m) => m.actual) ? (
              <ForecastChart data={d.forecast} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No won deals yet, so there&apos;s nothing to project.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Forecast = average won value per month over the last 90 days ({formatLakh(d.runRate)}). Weighted open pipeline: {formatLakh(d.weightedPipeline)}.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_4fr_2fr]">
        <DealTable title="Top won leads" rows={d.topWon} dateLabel="Won on" empty="No wins in this period yet." />
        <DealTable title="Top lost leads" rows={d.topLost} dateLabel="Lost on" empty="Nothing lost in this period." showStage />
        <Card>
          <CardHeader title="Activities" />
          <div className="divide-y divide-slate-100 px-4 pb-2">
            <ActivityRow href="/dashboard/my-day" label="Overdue follow-ups" hint="Right now" count={k.overdue} alert />
            <ActivityRow href="/dashboard/leads" label="Uncontacted > SLA" hint="Not called within 1 working hour" count={k.uncontacted} alert />
            <ActivityRow href="/dashboard/queues" label="Out of area" hint="In this period" count={k.outOfArea} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
        <Card className="xl:col-span-2">
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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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

function KpiTile({
  label,
  value,
  delta,
  deltaUnit = "%",
  compare,
  note,
  trend,
  money,
  percent,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaUnit?: string;
  compare?: string;
  note?: string;
  trend?: { label: string; value: number | null }[];
  money?: boolean;
  percent?: boolean;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="truncate text-sm font-medium text-ink" title={label}>{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-slate-500">
        {delta != null && (
          <div>
            <span className={cn("inline-flex items-center gap-0.5 font-medium", delta < 0 ? "text-rose-600" : "text-emerald-600")}>
              {delta < 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
              {Math.abs(delta)}{deltaUnit === "%" ? "%" : ` ${deltaUnit}`}
            </span>{" "}
            {compare}
          </div>
        )}
        {note && <div>{note}</div>}
      </div>
      {trend && <div className="mt-auto"><Sparkline data={trend} valueLabel={label} format={money ? "money" : percent ? "percent" : "count"} /></div>}
    </Card>
  );
}

function DealTable({
  title,
  rows,
  dateLabel,
  empty,
  showStage,
}: {
  title: string;
  rows: { id: string; name: string; owner: string; stage: string; value: number; date: Date }[];
  dateLabel: string;
  empty: string;
  showStage?: boolean;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="overflow-x-auto px-4 pb-3">
        {rows.length ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1.5 font-medium">Lead</th>
                <th className="py-1.5 font-medium">Salesperson</th>
                {showStage && <th className="py-1.5 font-medium">Reason</th>}
                <th className="py-1.5 text-right font-medium">Value</th>
                <th className="py-1.5 text-right font-medium">{dateLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="text-slate-700">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <Link href={`/dashboard/leads/${r.id}`} className="font-medium text-ink hover:underline">{r.name}</Link>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{r.owner}</td>
                  {showStage && <td className="max-w-32 truncate py-2 pr-3" title={r.stage}>{r.stage}</td>}
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">{formatLakh(r.value)}</td>
                  <td className="py-2 pl-3 text-right whitespace-nowrap tabular-nums">{formatIST(r.date, "d MMM")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </Card>
  );
}

function ActivityRow({ href, label, hint, count, alert }: { href: string; label: string; hint: string; count: number; alert?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-80">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ink">{label}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
      <span className={cn("rounded-md px-2.5 py-0.5 text-sm font-semibold tabular-nums", alert && count ? "bg-rose-100 text-rose-700" : "bg-brand text-white")}>{count}</span>
    </Link>
  );
}
