import { cookies } from "next/headers";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { assignableUsers, branchesList } from "@/lib/data/leads";
import { getMasters } from "@/lib/data/masters";
import { PageHeader } from "@/components/ui";
import { pipelineStages } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { startOfIstDay } from "@/lib/domain/time";
import { Kanban } from "./kanban";
import { PipelineSwitcher } from "./pipeline-switcher";

type SP = Promise<Record<string, string | undefined>>;

export default async function PipelinePage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const masters = await getMasters();
  const pipelines = masters.pipelines.filter((p) => p.isActive);
  // ?pipeline= wins, then the last one this browser looked at (cookie), then the default
  const remembered = (await cookies()).get("kanban_pipeline")?.value;
  const pipeline = pipelines.find((p) => p.id === sp.pipeline) ?? pipelines.find((p) => p.id === remembered) ?? masters.defaultPipeline;
  const stages = pipelineStages(masters.stages, pipeline.id, { includeInactive: true });

  const where: Prisma.LeadWhereInput = {
    AND: [
      leadWhere(user),
      { pipelineId: pipeline.id },
      sp.branch ? { branchId: sp.branch } : {},
      sp.owner ? { ownerId: sp.owner } : {},
      sp.product ? { products: { some: { id: sp.product } } } : {},
    ],
  };
  const since = startOfIstDay(new Date(), -30);
  const [leads, won, lost, branches, people] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [where, { stage: { category: "OPEN" } }] },
      select: {
        id: true,
        refCode: true,
        firstName: true,
        lastName: true,
        stageId: true,
        products: { select: { name: true }, orderBy: { sortOrder: "asc" } },
        estimatedValueInr: true,
        orderValueInr: true,
        nextFollowUpAt: true,
        possessionDate: true,
        siteAddressRaw: true,
        locality: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { stageChangedAt: "desc" },
      take: 400,
    }),
    prisma.lead.count({ where: { AND: [where, { stage: { category: "WON" }, stageChangedAt: { gte: since } }] } }),
    prisma.lead.count({ where: { AND: [where, { stage: { category: "LOST" }, stageChangedAt: { gte: since } }] } }),
    branchesList(user),
    assignableUsers(user),
  ]);
  const seesOthers = user.scope !== "OWN";
  const openCount = stages.filter((s) => s.isActive && s.category === "OPEN").length;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description={`${pipeline.name}: ${openCount} open stages, set by your admin. Drag a card to move it; dropping on Lost asks for the reason.`}
        actions={
          <form className="flex flex-wrap gap-2">
            {pipelines.length > 1 && <PipelineSwitcher value={pipeline.id} pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))} />}
            <input type="hidden" name="pipeline" value={pipeline.id} />
            {seesOthers && (
              <select name="branch" defaultValue={sp.branch ?? ""} className="field w-auto py-1.5">
                <option value="">All branches</option>
                {branches
                  .filter((b) => b.kind === "EXPERIENCE_CENTRE")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {shortBranch(b.name)}
                    </option>
                  ))}
              </select>
            )}
            {seesOthers && (
              <select name="owner" defaultValue={sp.owner ?? ""} className="field w-auto py-1.5">
                <option value="">Everyone</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <select name="product" defaultValue={sp.product ?? ""} className="field w-auto py-1.5">
              <option value="">All products</option>
              {masters.products
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button className="btn-secondary py-1.5">Filter</button>
            {can(user, "pipelines.manage") && (
              <Link href={`/dashboard/masters/pipelines?id=${pipeline.id}`} className="btn-ghost py-1.5">
                Edit stages
              </Link>
            )}
          </form>
        }
      />
      <Kanban
        leads={leads.map((l) => ({
          id: l.id,
          refCode: l.refCode,
          name: `${l.firstName} ${l.lastName ?? ""}`.trim(),
          stageId: l.stageId,
          area: l.locality?.name ?? l.siteAddressRaw ?? "",
          products: l.products.map((p) => p.name),
          value: l.orderValueInr ?? l.estimatedValueInr,
          owner: l.owner?.name ?? null,
          nextFollowUpAt: l.nextFollowUpAt,
          possessionDate: l.possessionDate,
        }))}
        stages={stages}
        wonCount={won}
        lostCount={lost}
        canReopen={can(user, "pipeline.reopen")}
        canMove={can(user, "pipeline.move")}
      />
    </div>
  );
}
