import Link from "next/link";
import { HardHat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { FeatureBadge } from "@/components/feature-badge";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PROJECT_STAGES, PROJECT_STAGE_LABEL } from "@/lib/domain/labels";
import { formatISTDate } from "@/lib/domain/time";
import { formatLakh } from "@/lib/domain/money";
import { shortBranch } from "@/lib/domain/routing/decide";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { lead: leadWhere(user) },
    include: { lead: { select: { refCode: true, firstName: true, lastName: true, orderValueInr: true, products: true } }, branch: true, designer: { select: { name: true } }, supervisor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Projects"
        badge={<FeatureBadge feature="F36" />}
        description="After the sale: your “Current Live Projects” sheet — measurement to handover, with the 5-year warranty date. Opened automatically when a lead is won. Beyond the launch package."
      />
      {projects.length === 0 ? (
        <Card>
          <EmptyState icon={HardHat} title="No projects yet">Mark a lead as Closed Won and its project appears here.</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Designer · Supervisor</th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Expected handover</th>
                <th className="p-3 text-left">Warranty until</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const i = PROJECT_STAGES.indexOf(p.stage);
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <Link href={`/dashboard/projects/${p.id}`} className="font-medium text-ink hover:underline">
                        {p.lead.firstName} {p.lead.lastName}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {p.lead.refCode} · {formatLakh(p.lead.orderValueInr)}
                      </div>
                    </td>
                    <td className="p-3">{shortBranch(p.branch.name)}</td>
                    <td className="p-3 text-slate-600">
                      {p.designer?.name ?? "—"} · {p.supervisor?.name ?? "—"}
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-slate-500">
                        {i + 1}/8 · {PROJECT_STAGE_LABEL[p.stage]}
                      </div>
                      <div className="mt-1 flex gap-0.5">
                        {PROJECT_STAGES.map((s, k) => (
                          <span key={s} className={k <= i ? "h-1.5 w-5 rounded bg-violet-500" : "h-1.5 w-5 rounded bg-slate-200"} />
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{p.handoverAt ? <span className="text-emerald-700">Handed over {formatISTDate(p.handoverAt)}</span> : formatISTDate(p.expectedHandoverAt)}</td>
                    <td className="p-3">{p.warrantyEndsAt ? formatISTDate(p.warrantyEndsAt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
