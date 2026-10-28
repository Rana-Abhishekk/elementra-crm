import { prisma } from "@/lib/prisma";
import { createCompany } from "../actions";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Companies</h1>
      <form action={createCompany} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <input name="name" placeholder="Company name *" required className="field" />
        <input name="domain" placeholder="Website" className="field" />
        <input name="industry" placeholder="Industry" className="field" />
        <input name="phone" placeholder="Phone" className="field" />
        <button className="btn">Add company</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">Name</th><th className="p-3">Website</th><th className="p-3">Industry</th><th className="p-3">Contacts</th><th className="p-3">Deals</th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.domain ?? "—"}</td>
                <td className="p-3">{c.industry ?? "—"}</td>
                <td className="p-3">{c._count.contacts}</td>
                <td className="p-3">{c._count.deals}</td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">No companies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
