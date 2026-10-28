import { prisma } from "@/lib/prisma";
import { createContact } from "../actions";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } }, owner: { select: { name: true } } },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contacts</h1>
      <form action={createContact} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-7">
        <input name="firstName" placeholder="First name *" required className="field" />
        <input name="lastName" placeholder="Last name" className="field" />
        <input name="email" type="email" placeholder="Email" className="field" />
        <input name="phone" placeholder="Phone" className="field" />
        <input name="title" placeholder="Job title" className="field" />
        <select name="companyId" className="field" defaultValue="">
          <option value="">No company</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn">Add contact</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Company</th><th className="p-3">Owner</th></tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.firstName} {c.lastName}<div className="text-xs font-normal text-slate-500">{c.title}</div></td>
                <td className="p-3">{c.email ?? "—"}</td>
                <td className="p-3">{c.phone ?? "—"}</td>
                <td className="p-3">{c.company?.name ?? "—"}</td>
                <td className="p-3">{c.owner?.name ?? "—"}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">No contacts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
