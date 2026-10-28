import type { CompanyKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader, Tabs } from "@/components/ui";
import { formatLakh } from "@/lib/domain/money";
import { createCompany } from "../actions";

const KINDS: { key: string; label: string; kind?: CompanyKind }[] = [
  { key: "all", label: "All" },
  { key: "architects", label: "Architect firms", kind: "ARCHITECT_FIRM" },
  { key: "builders", label: "Builders", kind: "BUILDER" },
];

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const requested = (await searchParams).kind;
  const tab = KINDS.find((k) => k.key === requested) ?? KINDS[0];
  const companies = await prisma.company.findMany({
    where: tab.kind ? { kind: tab.kind } : {},
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, deals: true } },
      // Partner view: leads where one of this firm's architects is involved
      contacts: { where: { kind: "ARCHITECT" }, select: { influencedLeads: { select: { stage: true, orderValueInr: true } } } },
    },
  });
  const partner = (c: (typeof companies)[number]) => {
    const leads = c.contacts.flatMap((x) => x.influencedLeads);
    return { influenced: leads.length, won: leads.filter((l) => l.stage === "CLOSED_WON").reduce((s, l) => s + (l.orderValueInr ?? 0), 0) };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Companies & partners" description="Architect firms who refer customers, builders and vendors." />
      <Tabs active={tab.key} tabs={KINDS.map((k) => ({ key: k.key, label: k.label, href: `?kind=${k.key}` }))} />
      <form action={createCompany} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-6">
        <input name="name" placeholder="Company name *" required className="field" />
        <input name="domain" placeholder="Website" className="field" />
        <input name="industry" placeholder="Industry" className="field" />
        <input name="phone" placeholder="Phone" className="field" />
        <select name="kind" className="field" defaultValue={tab.kind ?? "OTHER"}>
          <option value="ARCHITECT_FIRM">Architect firm</option>
          <option value="BUILDER">Builder</option>
          <option value="VENDOR">Vendor</option>
          <option value="OTHER">Other</option>
        </select>
        <button className="btn">Add company</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">Name</th><th className="p-3">Website</th><th className="p-3">Industry</th><th className="p-3">Contacts</th><th className="p-3">Deals</th><th className="p-3">Leads influenced</th><th className="p-3">Won value</th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}<div className="text-xs font-normal text-slate-500">{c.kind.replace("_", " ").toLowerCase()}</div></td>
                <td className="p-3">{c.domain ?? "—"}</td>
                <td className="p-3">{c.industry ?? "—"}</td>
                <td className="p-3">{c._count.contacts}</td>
                <td className="p-3">{c._count.deals}</td>
                <td className="p-3">{c.kind === "ARCHITECT_FIRM" ? partner(c).influenced : "—"}</td>
                <td className="p-3">{c.kind === "ARCHITECT_FIRM" ? formatLakh(partner(c).won) : "—"}</td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">No companies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
