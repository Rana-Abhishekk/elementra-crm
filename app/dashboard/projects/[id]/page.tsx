import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canSeeLead } from "@/lib/auth/scope";
import { FeatureBadge } from "@/components/feature-badge";
import { Card, PageHeader } from "@/components/ui";
import { PROJECT_STAGES, PROJECT_STAGE_LABEL } from "@/lib/domain/labels";
import { formatIST, formatISTDate } from "@/lib/domain/time";
import { formatINR } from "@/lib/domain/money";
import { shortBranch } from "@/lib/domain/routing/decide";
import { cn } from "@/lib/utils";
import { AdvanceButton } from "./advance-button";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const p = await prisma.project.findUnique({ where: { id }, include: { lead: { include: { products: { select: { name: true }, orderBy: { sortOrder: "asc" } } } }, branch: true, designer: { select: { name: true } }, supervisor: { select: { name: true } } } });
  if (!p || !canSeeLead(user, p.lead)) notFound();
  const i = PROJECT_STAGES.indexOf(p.stage);
  const history = (p.stageHistory as { stage: string; at: string; by?: string }[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="size-4" /> Projects
      </Link>
      <PageHeader
        title={`${p.lead.firstName} ${p.lead.lastName ?? ""}`}
        badge={<FeatureBadge feature="F36" />}
        description={`${p.lead.refCode} · ${shortBranch(p.branch.name)} · ${p.lead.products.map((x) => x.name).join(", ")} · ${formatINR(p.lead.orderValueInr)}`}
        actions={i < PROJECT_STAGES.length - 1 ? <AdvanceButton id={p.id} next={PROJECT_STAGE_LABEL[PROJECT_STAGES[i + 1]]} /> : null}
      />
      <Card className="mb-6 overflow-x-auto p-5">
        <ol className="flex min-w-[720px] items-start">
          {PROJECT_STAGES.map((s, k) => {
            const done = k < i || p.stage === "HANDOVER";
            const current = k === i && p.stage !== "HANDOVER";
            const at = history.find((h) => h.stage === s)?.at;
            return (
              <li key={s} className="relative flex flex-1 flex-col items-center text-center">
                {k > 0 && <span className={cn("absolute top-4 right-1/2 h-0.5 w-full", k <= i ? "bg-violet-500" : "bg-slate-200")} />}
                <span className={cn("relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold", done ? "border-violet-500 bg-violet-500 text-white" : current ? "border-violet-500 bg-white text-violet-700" : "border-slate-200 bg-white text-slate-400")}>
                  {done ? <Check className="size-4" /> : k + 1}
                </span>
                <span className={cn("mt-2 px-1 text-xs", current ? "font-semibold text-ink" : "text-slate-600")}>{PROJECT_STAGE_LABEL[s]}</span>
                {at && <span className="text-[11px] text-slate-400">{formatIST(at, "d MMM")}</span>}
              </li>
            );
          })}
        </ol>
      </Card>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 text-sm">
          <div className="label">Site designer</div>
          {p.designer?.name ?? "—"}
        </Card>
        <Card className="p-4 text-sm">
          <div className="label">Site supervisor</div>
          {p.supervisor?.name ?? "—"}
        </Card>
        <Card className="p-4 text-sm">
          <div className="label">{p.handoverAt ? "Handed over" : "Expected handover"}</div>
          {formatISTDate(p.handoverAt ?? p.expectedHandoverAt)}
        </Card>
        <Card className="p-4 text-sm">
          <div className="label">Warranty until (handover + 5 years)</div>
          {p.warrantyEndsAt ? formatISTDate(p.warrantyEndsAt) : "Starts at handover"}
        </Card>
      </div>
    </div>
  );
}
