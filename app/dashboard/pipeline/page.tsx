import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isManager, leadWhereForUser } from "@/lib/access";
import { assignableUsers, branchesList } from "@/lib/data/leads";
import { PageHeader } from "@/components/ui";
import { OPEN_STAGES } from "@/lib/domain/stages";
import { PRODUCT_LABEL } from "@/lib/domain/labels";
import { shortBranch } from "@/lib/domain/routing/decide";
import { startOfIstDay } from "@/lib/domain/time";
import type { Prisma, Product } from "@prisma/client";
import { Kanban } from "./kanban";

type SP = Promise<Record<string, string | undefined>>;

export default async function PipelinePage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const where: Prisma.LeadWhereInput = {
    AND: [
      leadWhereForUser(user),
      sp.branch ? { branchId: sp.branch } : {},
      sp.owner ? { ownerId: sp.owner } : {},
      sp.product ? { products: { has: sp.product as Product } } : {},
    ],
  };
  const since = startOfIstDay(new Date(), -30);
  const [leads, won, lost, branches, people] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [where, { stage: { in: OPEN_STAGES } }] },
      select: {
        id: true,
        refCode: true,
        firstName: true,
        lastName: true,
        stage: true,
        products: true,
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
    prisma.lead.count({ where: { AND: [where, { stage: "CLOSED_WON", stageChangedAt: { gte: since } }] } }),
    prisma.lead.count({ where: { AND: [where, { stage: "CLOSED_LOST", stageChangedAt: { gte: since } }] } }),
    branchesList(),
    assignableUsers(),
  ]);
  const manager = isManager(user);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Your 14 stages, in your words. Drag a card to move it; dropping on Lost asks for the reason."
        actions={
          <form className="flex flex-wrap gap-2">
            {manager && (
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
            {manager && (
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
              {Object.entries(PRODUCT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button className="btn-secondary py-1.5">Filter</button>
          </form>
        }
      />
      <Kanban
        leads={leads.map((l) => ({
          id: l.id,
          refCode: l.refCode,
          name: `${l.firstName} ${l.lastName ?? ""}`.trim(),
          stage: l.stage,
          area: l.locality?.name ?? l.siteAddressRaw ?? "",
          products: l.products,
          value: l.orderValueInr ?? l.estimatedValueInr,
          owner: l.owner?.name ?? null,
          nextFollowUpAt: l.nextFollowUpAt,
          possessionDate: l.possessionDate,
        }))}
        wonCount={won}
        lostCount={lost}
        canReopen={manager}
      />
    </div>
  );
}
