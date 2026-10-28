import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/access";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { formatIST } from "@/lib/domain/time";
import { ImportWizard } from "./import-wizard";

export default async function ImportsPage() {
  await requirePageRole("OWNER", "ADMIN", "PRESALES");
  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  const users = await prisma.user.findMany({ where: { id: { in: jobs.map((j) => j.createdById) } }, select: { id: true, name: true } });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Imports" description="Bring leads in from a Meta Leads Center export. Every row goes through the same routing as a live lead; re-importing the same file creates nothing twice." />
      <ImportWizard />
      <Card className="mt-6">
        <CardHeader title="Import history" />
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="p-3 text-left">File</th>
              <th className="p-3 text-left">When</th>
              <th className="p-3 text-left">By</th>
              <th className="p-3 text-right">Rows</th>
              <th className="p-3 text-right">Created</th>
              <th className="p-3 text-right">Duplicates</th>
              <th className="p-3 text-right">Failed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{j.fileName}</td>
                <td className="p-3">{formatIST(j.createdAt)}</td>
                <td className="p-3">{users.find((u) => u.id === j.createdById)?.name ?? "—"}</td>
                <td className="p-3 text-right">{j.totalRows}</td>
                <td className="p-3 text-right text-emerald-700">{j.created}</td>
                <td className="p-3 text-right">{j.duplicates}</td>
                <td className="p-3 text-right text-rose-600">{j.failed}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No imports yet. Try the sample file in <code>prisma/fixtures/meta-leads-sample.csv</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
