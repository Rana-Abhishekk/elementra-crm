import Link from "next/link";
import type { ContactKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader, Tabs } from "@/components/ui";
import { formatLakh } from "@/lib/domain/money";
import { formatPhone } from "@/lib/domain/phone";
import { createContact } from "../actions";

const KINDS: { key: string; label: string; kind?: ContactKind }[] = [
  { key: "all", label: "All" },
  { key: "customers", label: "Customers", kind: "CUSTOMER" },
  { key: "architects", label: "Architects", kind: "ARCHITECT" },
];

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = KINDS.find((k) => k.key === sp.kind) ?? KINDS[0];
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: {
        ...(tab.kind ? { kind: tab.kind } : {}),
        ...(sp.q ? { OR: [{ firstName: { contains: sp.q, mode: "insensitive" } }, { lastName: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        company: { select: { name: true } },
        owner: { select: { name: true } },
        _count: { select: { leads: true, influencedLeads: true } },
        influencedLeads: { where: { stage: "CLOSED_WON" }, select: { orderValueInr: true } },
      },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const architects = tab.kind === "ARCHITECT";

  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description="Every enquiry creates or links a customer contact by phone number. Architects are partners who influence deals." />
      <Tabs active={tab.key} tabs={KINDS.map((k) => ({ key: k.key, label: k.label, href: `?kind=${k.key}` }))} />
      <form action={createContact} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 lg:grid-cols-8">
        <input name="firstName" placeholder="First name *" required className="field" />
        <input name="lastName" placeholder="Last name" className="field" />
        <input name="email" type="email" placeholder="Email" className="field" />
        <input name="phone" placeholder="Phone" className="field" />
        <input name="title" placeholder="Job title" className="field" />
        <select name="kind" className="field" defaultValue={tab.kind ?? "CUSTOMER"}>
          <option value="CUSTOMER">Customer</option>
          <option value="ARCHITECT">Architect</option>
          <option value="OTHER">Other</option>
        </select>
        <select name="companyId" className="field" defaultValue="">
          <option value="">No company</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn">Add contact</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3">Company</th>
              <th className="p-3">{architects ? "Leads influenced" : "Enquiries"}</th>
              {architects && <th className="p-3">Won value</th>}
              <th className="p-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">
                  <Link href={`/dashboard/contacts/${c.id}`} className="hover:underline">{c.firstName} {c.lastName}</Link>
                  <div className="text-xs font-normal text-slate-500">{c.kind === "ARCHITECT" ? "Architect" : c.kind === "CUSTOMER" ? "Customer" : "Other"}{c.title ? ` · ${c.title}` : ""}</div>
                </td>
                <td className="p-3">{c.phoneE164 ? formatPhone(c.phoneE164) : (c.phone ?? "—")}</td>
                <td className="p-3">{c.email ?? "—"}</td>
                <td className="p-3">{c.company?.name ?? "—"}</td>
                <td className="p-3">{c.kind === "ARCHITECT" ? c._count.influencedLeads : c._count.leads}</td>
                {architects && <td className="p-3">{formatLakh(c.influencedLeads.reduce((s, l) => s + (l.orderValueInr ?? 0), 0))}</td>}
                <td className="p-3">{c.owner?.name ?? "—"}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">No contacts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
