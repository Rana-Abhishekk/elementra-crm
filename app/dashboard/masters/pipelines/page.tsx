import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PipelineEditor } from "./pipeline-editor";

export default async function PipelinesMasterPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requirePagePermission("pipelines.manage");
  const sp = await searchParams;
  const [pipelines, products, stageCounts] = await Promise.all([
    prisma.pipeline.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { autoProducts: { select: { id: true } }, _count: { select: { leads: true } }, stages: { orderBy: { sortOrder: "asc" } } } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.lead.groupBy({ by: ["stageId"], _count: true }),
  ]);
  const selected = pipelines.find((p) => p.id === sp.id) ?? pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const used = new Map(stageCounts.map((c) => [c.stageId, c._count]));

  return (
    <div>
      <PageHeader
        title="Pipelines & Statuses"
        description="The stage headings everyone sees: kanban columns, badges, filters, reports and reminders all follow this list. Rename, reorder, add stages, set colours and Won / Lost."
      />
      <PipelineEditor
        pipelines={pipelines.map((p) => ({ id: p.id, name: p.name, description: p.description, isDefault: p.isDefault, isActive: p.isActive, leads: p._count.leads, autoProductIds: p.autoProducts.map((a) => a.id) }))}
        selectedId={selected.id}
        stages={selected.stages.map((s) => ({ ...s, usedBy: used.get(s.id) ?? 0 }))}
        products={products}
      />
    </div>
  );
}
