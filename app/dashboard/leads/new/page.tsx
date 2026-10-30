import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { getMasters } from "@/lib/data/masters";
import { PageHeader } from "@/components/ui";
import { NewLeadForm } from "./new-lead-form";

export default async function NewLeadPage() {
  await requirePagePermission("leads.create");
  const masters = await getMasters();
  const architects = await prisma.contact.findMany({
    where: { kind: "ARCHITECT" },
    select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } },
    orderBy: { firstName: "asc" },
  });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New lead" description="Saved leads are routed to the right branch and assigned automatically — the reason is written on the lead. One open lead per phone number: if the number already has one, you'll be sent to it." />
      <NewLeadForm
        architects={architects.map((a) => ({ id: a.id, label: `${a.firstName} ${a.lastName ?? ""} · ${a.company?.name ?? ""}` }))}
        products={masters.products.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name }))}
        sources={masters.sources.filter((x) => x.isActive).map((x) => ({ id: x.id, name: x.name }))}
      />
    </div>
  );
}
