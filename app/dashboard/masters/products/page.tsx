import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SimpleMaster } from "../simple-master";

export default async function ProductsMasterPage() {
  await requirePagePermission("masters.manage");
  const products = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { leads: true, pipelines: true } } } });
  return (
    <div>
      <PageHeader
        title="Products"
        description="What customers ask for. Used on lead forms, /enquire, filters, reports and pipeline auto-selection (Masters → Pipelines). Meta answer keys map the lead-form answer to the product."
      />
      <SimpleMaster
        kind="product"
        keyHint="The value Meta sends for the product question, e.g. elementra_kitchens. Names also match automatically (“Kitchen, Wardrobes” in a sheet)."
        rows={products.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, usedBy: p._count.leads, keys: p.metaAnswerKeys }))}
      />
    </div>
  );
}
