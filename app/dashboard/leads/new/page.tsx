import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { NewLeadForm } from "./new-lead-form";

export default async function NewLeadPage() {
  await requireUser();
  const architects = await prisma.contact.findMany({
    where: { kind: "ARCHITECT" },
    select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } },
    orderBy: { firstName: "asc" },
  });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New lead" description="Saved leads are routed to the right branch and assigned automatically — the reason is written on the lead." />
      <NewLeadForm architects={architects.map((a) => ({ id: a.id, label: `${a.firstName} ${a.lastName ?? ""} · ${a.company?.name ?? ""}` }))} />
    </div>
  );
}
