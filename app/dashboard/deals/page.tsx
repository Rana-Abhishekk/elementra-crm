import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { formatMoney, STAGE_LABELS } from "@/lib/format";
import { createDeal, updateDealStage } from "../actions";

const STAGES = Object.entries(STAGE_LABELS);

export default async function DealsPage() {
  const [deals, companies, contacts, pipeline] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { updatedAt: "desc" },
      include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } }, lead: { select: { id: true, refCode: true } } },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.contact.findMany({ orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    prisma.deal.groupBy({ by: ["stage"], _count: true, _sum: { amount: true } }),
  ]);
  const byStage = new Map(pipeline.map((p) => [p.stage, p]));

  return (
    <div className="space-y-6">
      <PageHeader title="Deals" description="Won leads become deals automatically (with the lead linked). You can still add deals by hand." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map(([stage, label]) => {
          const row = byStage.get(stage as keyof typeof STAGE_LABELS);
          return (
            <div key={stage} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="font-semibold">{row?._count ?? 0}</div>
              <div className="text-xs text-slate-500">{formatMoney(row?._sum.amount ?? 0)}</div>
            </div>
          );
        })}
      </div>
      <form action={createDeal} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input name="title" placeholder="Deal title *" required className="field" />
        <input name="amount" type="number" min="0" step="1" placeholder="Amount (₹)" className="field" />
        <select name="stage" className="field" defaultValue="LEAD">
          {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="companyId" className="field" defaultValue="">
          <option value="">No company</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="contactId" className="field" defaultValue="">
          <option value="">No contact</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
        </select>
        <button className="btn">Add deal</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">Deal</th><th className="p-3">Amount</th><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Stage</th></tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{d.title}{d.lead && <div className="text-xs font-normal"><Link href={`/dashboard/leads/${d.lead.id}`} className="text-brand hover:underline">Lead {d.lead.refCode}</Link></div>}</td>
                <td className="p-3">{formatMoney(d.amount, d.currency)}</td>
                <td className="p-3">{d.company?.name ?? "—"}</td>
                <td className="p-3">{d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}` : "—"}</td>
                <td className="p-3">
                  <form action={updateDealStage.bind(null, d.id)} className="flex gap-2">
                    <select name="stage" defaultValue={d.stage} className="field py-1">
                      {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button className="text-sm text-brand hover:underline">Save</button>
                  </form>
                </td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">No deals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
