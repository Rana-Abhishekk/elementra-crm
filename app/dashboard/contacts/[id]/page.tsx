import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { StageBadge } from "@/components/lead-badges";
import { formatPhone } from "@/lib/domain/phone";
import { formatIST } from "@/lib/domain/time";
import { formatLakh } from "@/lib/domain/money";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await prisma.contact.findUnique({ where: { id }, include: { company: true } });
  if (!c) notFound();
  const scope = leadWhere(user);
  const leads = await prisma.lead.findMany({
    where: { AND: [scope, c.kind === "ARCHITECT" ? { architectId: id } : { contactId: id }] },
    include: { owner: { select: { name: true } }, stage: { select: { label: true, color: true, isActive: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/contacts" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="size-4" /> Contacts
      </Link>
      <PageHeader
        title={`${c.firstName} ${c.lastName ?? ""}`}
        description={[c.kind === "ARCHITECT" ? "Architect" : "Customer", c.company?.name, c.phoneE164 ? formatPhone(c.phoneE164) : c.phone, c.email].filter(Boolean).join(" · ")}
      />
      <Card>
        <CardHeader title={c.kind === "ARCHITECT" ? `Leads influenced (${leads.length})` : `Enquiries (${leads.length})`} />
        <div className="divide-y divide-slate-100">
          {leads.map((l) => (
            <Link key={l.id} href={`/dashboard/leads/${l.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">
                  {l.refCode} · {l.firstName} {l.lastName}
                </div>
                <div className="text-xs text-slate-500">
                  {formatIST(l.createdAt, "d MMM yyyy")} · {l.owner?.name ?? "Unassigned"}
                </div>
              </div>
              <span className="text-xs">{formatLakh(l.orderValueInr ?? l.estimatedValueInr)}</span>
              <StageBadge stage={l.stage} />
            </Link>
          ))}
          {leads.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">No leads you can see are linked to this contact.</p>}
        </div>
      </Card>
    </div>
  );
}
