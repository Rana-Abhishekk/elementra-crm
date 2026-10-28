import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/access";
import { parseReportFilters, reportsData } from "@/lib/data/reports";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { HBars } from "@/components/charts";
import { formatINR, formatLakh } from "@/lib/domain/money";
import { shortBranch } from "@/lib/domain/routing/decide";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("OWNER", "ADMIN", "SALES_MANAGER");
  const sp = await searchParams;
  const f = parseReportFilters(sp);
  const [d, branches] = await Promise.all([reportsData(user, f), prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE" }, orderBy: { name: "asc" } })]);
  const qs = new URLSearchParams({ from: f.fromStr, to: f.toStr, ...(f.branchId ? { branch: f.branchId } : {}) }).toString();
  const csv = (report: string) => `/api/reports/export?report=${report}&${qs}`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports"
        description="These are the same views as your Executive Summary sheet — now always up to date."
        actions={
          <Link href={`/api/leads/export?view=all&from=${f.fromStr}&to=${f.toStr}${f.branchId ? `&branch=${f.branchId}` : ""}`} prefetch={false} className="btn-secondary">
            <Download className="size-4" /> Leads CSV
          </Link>
        }
      />
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="label">From</span>
          <input type="date" name="from" defaultValue={f.fromStr} className="field" />
        </label>
        <label className="text-sm">
          <span className="label">To</span>
          <input type="date" name="to" defaultValue={f.toStr} className="field" />
        </label>
        {user.role !== "SALES_MANAGER" && (
          <label className="text-sm">
            <span className="label">Branch</span>
            <select name="branch" defaultValue={f.branchId ?? ""} className="field">
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {shortBranch(b.name)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="btn">Apply</button>
        <span className="ml-auto text-sm text-slate-500">{d.total} leads in range</span>
      </form>

      <Card className="mb-6">
        <CardHeader title="A · Leads by status and product, by month" action={<CsvLink href={csv("a")} />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 text-left">Status / Product</th>
                {d.months.map((m) => (
                  <th key={m.key} className="p-2 text-right whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
                <th className="p-2 text-right">Grand total</th>
              </tr>
            </thead>
            <tbody>
              {d.statusTotals.map((g) => (
                <StatusGroup key={g.status} g={g} months={d.months} />
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="p-2">Grand total</td>
                {d.months.map((m) => (
                  <td key={m.key} className="p-2 text-right">
                    {d.statusTotals.reduce((s, g) => s + (g.byMonth[m.key] ?? 0), 0)}
                  </td>
                ))}
                <td className="p-2 text-right">{d.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="B · Handover count by branch" action={<CsvLink href={csv("b")} />} />
          <div className="p-4">
            <HBars data={d.handover.map((h) => ({ ...h, display: String(h.value) }))} valueLabel="Leads" />
          </div>
        </Card>
        <Card>
          <CardHeader title="C · Order value by branch and rep (won)" action={<CsvLink href={csv("c")} />} />
          <table className="w-full text-sm">
            <tbody>
              {d.pivotC.map((b) => (
                <BranchRows key={b.branch} b={b} />
              ))}
              {d.pivotC.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500">No won deals in this range.</td>
                </tr>
              )}
              {d.pivotC.length > 0 && (
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td className="p-2">Grand total</td>
                  <td className="p-2 text-right">{formatINR(d.pivotC.reduce((s, b) => s + b.total, 0))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Source → outcome" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-2 text-left">Source</th>
                  <th className="p-2 text-right">Leads</th>
                  <th className="p-2 text-right">Qualified+</th>
                  <th className="p-2 text-right">Won</th>
                  <th className="p-2 text-right">Lost</th>
                  <th className="p-2 text-right">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {d.conversion.map((c) => (
                  <tr key={c.source} className="border-t border-slate-100">
                    <td className="p-2">{c.source}</td>
                    <td className="p-2 text-right">{c.leads}</td>
                    <td className="p-2 text-right">{c.qualified}</td>
                    <td className="p-2 text-right">{c.won}</td>
                    <td className="p-2 text-right">{c.lost}</td>
                    <td className="p-2 text-right">{c.rate == null ? "n/a" : `${c.rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Why leads were lost" />
          <div className="p-4">
            <HBars data={d.lostReasons.map((r) => ({ ...r, display: String(r.value), highlight: r.label === "No response" }))} valueLabel="Lost leads" emphasis />
            <p className="mt-2 text-xs text-slate-500">“No response” is the one the reminder rules (R1–R6) target.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CsvLink({ href }: { href: string }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
      <Download className="size-3.5" /> CSV
    </Link>
  );
}

function StatusGroup({ g, months }: { g: { status: string; rows: { product: string; byMonth: Record<string, number>; total: number }[]; byMonth: Record<string, number>; total: number }; months: { key: string }[] }) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50/60 font-medium">
        <td className="p-2">{g.status}</td>
        {months.map((m) => (
          <td key={m.key} className="p-2 text-right">
            {g.byMonth[m.key] ?? ""}
          </td>
        ))}
        <td className="p-2 text-right">{g.total}</td>
      </tr>
      {g.rows.map((r) => (
        <tr key={r.product} className="border-t border-slate-100 text-slate-600">
          <td className="p-2 pl-6">{r.product}</td>
          {months.map((m) => (
            <td key={m.key} className="p-2 text-right">
              {r.byMonth[m.key] ?? ""}
            </td>
          ))}
          <td className="p-2 text-right">{r.total}</td>
        </tr>
      ))}
    </>
  );
}

function BranchRows({ b }: { b: { branch: string; reps: { rep: string; value: number }[]; total: number } }) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50/60 font-medium">
        <td className="p-2">{b.branch}</td>
        <td className="p-2 text-right" title={formatINR(b.total)}>
          {formatINR(b.total)}
        </td>
      </tr>
      {b.reps.map((r) => (
        <tr key={r.rep} className="border-t border-slate-100 text-slate-600">
          <td className="p-2 pl-6">{r.rep}</td>
          <td className="p-2 text-right" title={formatLakh(r.value)}>
            {formatINR(r.value)}
          </td>
        </tr>
      ))}
    </>
  );
}
