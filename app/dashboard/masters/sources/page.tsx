import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SimpleMaster } from "../simple-master";

export default async function SourcesMasterPage() {
  await requirePagePermission("masters.manage");
  const [sources, counts, unmapped] = await Promise.all([
    prisma.source.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.lead.groupBy({ by: ["sourceId"], _count: true }),
    // Intake values that matched no key were filed under the fallback source (see ingestLead)
    prisma.activity.findMany({ where: { type: "SYSTEM", meta: { path: ["unmappedSource"], not: Prisma.AnyNull } }, select: { meta: true }, take: 500, orderBy: { createdAt: "desc" } }),
  ]);
  const unmappedCounts = new Map<string, number>();
  for (const a of unmapped) {
    const v = (a.meta as { unmappedSource?: string | null } | null)?.unmappedSource;
    if (v) unmappedCounts.set(v, (unmappedCounts.get(v) ?? 0) + 1);
  }
  return (
    <div>
      <PageHeader title="Sources" description="Where leads come from. Dropdowns, filters, reports and integrations all use this list. Integration keys map incoming Meta / sheet / website data to a source." />
      {unmappedCounts.size > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Unmapped incoming values (filed under the fallback source):{" "}
          {[...unmappedCounts.entries()].map(([v, n]) => (
            <code key={v} className="mr-2 rounded bg-white px-1.5 py-0.5 text-xs">
              {v} × {n}
            </code>
          ))}
          Add the value as a key on the right source to map future leads.
        </div>
      )}
      <SimpleMaster
        kind="source"
        keyHint="meta:ig:paid · meta:ig:organic · meta:fb:paid · meta:fb:organic · sheet:<exact text in the sheet> · web:form · chat:website · chat:whatsapp"
        rows={sources.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive, usedBy: counts.find((c) => c.sourceId === s.id)?._count ?? 0, keys: s.integrationKeys, color: s.color, isPaid: s.isPaid, isFallback: s.isFallback }))}
      />
    </div>
  );
}
