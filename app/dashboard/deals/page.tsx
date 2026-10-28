import { prisma } from "@/lib/prisma";
import { formatMoney, STAGE_LABELS } from "@/lib/format";
import { createDeal, updateDealStage } from "../actions";

const STAGES = Object.entries(STAGE_LABELS);

export default async function DealsPage() {
  const [deals, companies, contacts] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { updatedAt: "desc" },
      include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.contact.findMany({ orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Deals</h1>
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
                <td className="p-3 font-medium">{d.title}</td>
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
