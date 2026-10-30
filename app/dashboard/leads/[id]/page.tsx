import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, HardHat, Handshake, Link2, MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/auth";
import { canEditLead } from "@/lib/auth/scope";
import { getMasters } from "@/lib/data/masters";
import { assignableUsers, getLeadForUser } from "@/lib/data/leads";
import { progressSimulatedMessages } from "@/lib/data/messages";
import { getSettings } from "@/lib/data/settings";
import { isSlaBreached } from "@/lib/data/sla";
import { Card, CardHeader, Chip } from "@/components/ui";
import { FollowUpBadge, PriorityChip, SourceBadge } from "@/components/lead-badges";
import { RoutingCard } from "@/components/routing-card";
import { CHANNEL_LABEL, PROJECT_STAGE_LABEL, TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { formatLakh } from "@/lib/domain/money";
import { formatPhone, waLink } from "@/lib/domain/phone";
import { formatIST, friendlyIST } from "@/lib/domain/time";
import { isOpen, pipelineStages } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { formatMoney } from "@/lib/format";
import type { RoutingCardData } from "@/components/routing-card";
import { StageControl } from "./stage-control";
import { Composer } from "./composer";
import { FollowUpWidget } from "./follow-up-widget";
import { Timeline } from "./timeline";
import { DetailsPanel } from "./details-panel";
import { ReassignControl } from "./reassign-control";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // Outside the user's scope → 404, same as a lead that doesn't exist (06 §5.3)
  if (!(await getLeadForUser(user, id))) notFound();
  await progressSimulatedMessages({ leadId: id });
  const lead = (await getLeadForUser(user, id))!;

  const [settings, masters, templates, branches, people, architects, messages] = await Promise.all([
    getSettings(),
    getMasters(),
    prisma.messageTemplate.findMany({ orderBy: [{ code: "asc" }, { language: "asc" }], select: { code: true, language: true, name: true, status: true, body: true } }),
    prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    assignableUsers(user),
    prisma.contact.findMany({ where: { kind: "ARCHITECT" }, select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } }, orderBy: { firstName: "asc" } }),
    prisma.outboundMessage.findMany({ where: { leadId: id }, select: { id: true, status: true, body: true, direction: true } }),
  ]);

  const editable = canEditLead(user, lead);
  const canMove = editable && can(user, "pipeline.move");
  const open = isOpen(lead.stage);
  const stages = pipelineStages(masters.stages, lead.pipelineId, { includeInactive: true }).filter((s) => s.isActive || s.id === lead.stageId);
  const now = new Date();
  const name = `${lead.salutation ? `${lead.salutation}. ` : ""}${lead.firstName} ${lead.lastName ?? ""}`.trim();
  const branchLabel = lead.branch ? (lead.branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(lead.branch.name)) : null;
  const decision = lead.routingDecisions[0];
  const routing: RoutingCardData | null = decision
    ? {
        rule: decision.rule,
        branchName: branchLabel ?? (lead.locationStatus === "OUT_OF_AREA" ? "the Out-of-area queue" : null),
        ownerName: lead.owner?.name ?? null,
        explanation: decision.explanation,
        candidates: (decision.candidates as RoutingCardData["candidates"]) ?? [],
        skipped: (decision.skipped as RoutingCardData["skipped"]) ?? [],
      }
    : null;
  const sla = isSlaBreached(lead, settings.sla.firstContactMins, settings.workingHours, now);
  const pipelines = masters.pipelines.filter((p) => p.isActive || p.id === lead.pipelineId).map((p) => ({ id: p.id, name: p.name }));
  const waText = `Hi ${lead.firstName}, this is ${user.name ?? "Elementra"} from Elementra.`;
  // Showroom visit hosts: people in an Experience Centre (the Online Desk doesn't host visits)
  const hosts = people.filter((p) => branches.some((b) => b.id === p.branch?.id)).map((p) => ({ id: p.id, name: p.name, branchId: p.branch?.id ?? null }));

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/dashboard/leads" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="size-4" /> Leads
      </Link>

      {/* Header */}
      <div className="card mb-6 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{name}</h1>
              <span className="text-sm text-slate-400">{lead.refCode}</span>
              <PriorityChip priority={lead.priority} />
              {lead.isReturning && <Chip className="bg-sky-50 text-sky-700 ring-sky-200">Returning customer</Chip>}
              {sla && <Chip className="bg-white text-rose-600 ring-rose-300">SLA breached</Chip>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <SourceBadge source={lead.source} withLabel />
              <span>· {CHANNEL_LABEL[lead.intakeChannel]}</span>
              <span>· received {formatIST(lead.createdAt)}</span>
              {lead.phoneE164 && <span>· {formatPhone(lead.phoneE164)}</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Building2 className="size-4 text-slate-400" />
                {branchLabel ?? (lead.locationStatus === "OUT_OF_AREA" ? "Out of area (queue)" : "No branch")}
              </span>
              <span className="text-slate-300">|</span>
              {can(user, "leads.reassign") ? (
                <ReassignControl leadId={lead.id} ownerId={lead.ownerId} people={people.map((p) => ({ id: p.id, name: p.name, branch: p.branch ? shortBranch(p.branch.name) : "", onLeave: p.onLeave }))} />
              ) : (
                <span className="text-slate-600">Owner: {lead.owner?.name ?? "Unassigned"}</span>
              )}
              {lead.handedOverBy && <span className="text-xs text-slate-400">· handed over by {lead.handedOverBy.name} {lead.handedOverAt ? formatIST(lead.handedOverAt) : ""}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <StageControl
              leadId={lead.id}
              stageId={lead.stageId}
              stages={stages}
              pipelineId={lead.pipelineId}
              pipelines={pipelines}
              editable={canMove}
              canReopen={can(user, "pipeline.reopen")}
              possessionDate={lead.possessionDate}
              orderValue={lead.orderValueInr ?? lead.estimatedValueInr}
            />
            {lead.phoneE164 && (
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <a href={`tel:${lead.phoneE164}`} className="btn-secondary py-2.5">
                  <Phone className="size-4" /> Call
                </a>
                <a href={waLink(lead.phoneE164, waText)} target="_blank" rel="noreferrer" className="btn-secondary py-2.5 text-emerald-700">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
        {(lead.duplicateOf || lead.duplicates.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
            <Link2 className="size-4" />
            {lead.duplicateOf && (
              <span>
                Earlier enquiry ({lead.duplicateOf.stage.label}):{" "}
                <Link className="font-medium underline" href={`/dashboard/leads/${lead.duplicateOf.id}`}>
                  {lead.duplicateOf.refCode}
                </Link>{" "}
                ({formatIST(lead.duplicateOf.createdAt, "d MMM yyyy")})
              </span>
            )}
            {lead.duplicates.map((d) => (
              <span key={d.id}>
                Later enquiry:{" "}
                <Link className="font-medium underline" href={`/dashboard/leads/${d.id}`}>
                  {d.refCode}
                </Link>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr_300px]">
        {/* Right column first on phones: what to do next */}
        <div className="space-y-6 lg:order-3">
          {open && (
            <FollowUpWidget leadId={lead.id} nextFollowUpAt={lead.nextFollowUpAt} editable={editable} badge={<FollowUpBadge at={lead.nextFollowUpAt} open={open} now={now} />} />
          )}
          <Card>
            <CardHeader title={`Open tasks (${lead.tasks.length})`} />
            <div className="divide-y divide-slate-100">
              {lead.tasks.map((t) => (
                <div key={t.id} className="px-4 py-2.5 text-sm">
                  <div className="font-medium text-ink">{t.title}</div>
                  <div className={t.dueAt < now ? "text-xs text-rose-600" : "text-xs text-slate-500"}>
                    {TASK_TYPE_LABEL[t.type]} · {friendlyIST(t.dueAt, now)} · {t.assignee.name}
                    {t.ruleCode && <span className="ml-1 text-slate-400">({t.ruleCode})</span>}
                  </div>
                </div>
              ))}
              {lead.tasks.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No open tasks.</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Showroom visits" />
            <div className="divide-y divide-slate-100">
              {lead.appointments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <CalendarClock className="size-4 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-ink">{formatIST(a.scheduledAt, "EEE d MMM, h:mm a")}</div>
                    <div className="text-xs text-slate-500">
                      {shortBranch(a.branch.name)}
                      {a.host ? ` · ${a.host.name}` : ""}
                    </div>
                  </div>
                  <Chip>{a.status.charAt(0) + a.status.slice(1).toLowerCase().replace("_", "-")}</Chip>
                </div>
              ))}
              {lead.appointments.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No visits booked yet.</p>}
            </div>
          </Card>
          {(lead.deal || lead.project) && (
            <Card className="p-4 text-sm">
              {lead.deal && (
                <Link href="/dashboard/deals" className="flex items-center gap-2 hover:underline">
                  <Handshake className="size-4 text-emerald-600" /> Deal won · {formatMoney(lead.deal.amount)}
                </Link>
              )}
              {lead.project && (
                <Link href={`/dashboard/projects/${lead.project.id}`} className="mt-2 flex items-center gap-2 hover:underline">
                  <HardHat className="size-4 text-violet-600" /> Project · {PROJECT_STAGE_LABEL[lead.project.stage]}
                </Link>
              )}
            </Card>
          )}
        </div>

        {/* Centre: composer + timeline */}
        <div className="min-w-0 space-y-4 lg:order-2">
          {editable && open && (
            <Composer
              leadId={lead.id}
              hasFollowUp={!!lead.nextFollowUpAt}
              hasPhone={!!lead.phoneE164}
              language={lead.language}
              firstName={lead.firstName}
              templates={templates}
              branches={branches.map((b) => ({ id: b.id, name: shortBranch(b.name) }))}
              hosts={hosts}
              defaultBranchId={lead.branch?.kind === "EXPERIENCE_CENTRE" ? lead.branchId : null}
              defaultHostId={lead.ownerId}
            />
          )}
          <Timeline
            activities={lead.activities.map((a) => ({
              id: a.id,
              type: a.type,
              body: a.body,
              callOutcome: a.callOutcome,
              createdAt: a.createdAt,
              actor: a.user?.name ?? null,
              messageStatus: (a.meta as { messageId?: string } | null)?.messageId ? (messages.find((m) => m.id === (a.meta as { messageId: string }).messageId)?.status ?? null) : null,
              messageBody: (a.meta as { messageId?: string } | null)?.messageId ? (messages.find((m) => m.id === (a.meta as { messageId: string }).messageId)?.body ?? null) : null,
            }))}
          />
        </div>

        {/* Left: details + routing */}
        <div className="space-y-6 lg:order-1">
          {routing && <RoutingCard data={routing} />}
          <DetailsPanel
            editable={editable}
            lead={{
              id: lead.id,
              salutation: lead.salutation,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phoneE164: lead.phoneE164,
              altPhoneE164: lead.altPhoneE164,
              siteAddressRaw: lead.siteAddressRaw,
              pincode: lead.pincode,
              localityLabel: lead.locality ? `${lead.locality.name}, ${lead.locality.city}` : null,
              products: lead.products.map((p) => p.id),
              sourceId: lead.sourceId,
              priority: lead.priority,
              language: lead.language,
              possessionDate: lead.possessionDate,
              budgetNote: lead.budgetNote,
              estimatedValueInr: lead.estimatedValueInr,
              orderValueInr: lead.orderValueInr,
              architectId: lead.architectId,
              architectCommissionPct: lead.architectCommissionPct,
              campaignName: lead.campaignName,
              adsetName: lead.adsetName,
              adName: lead.adName,
              formName: lead.formName,
              platform: lead.platform,
              contactId: lead.contactId,
            }}
            architects={architects.map((a) => ({ id: a.id, label: `${a.firstName} ${a.lastName ?? ""} · ${a.company?.name ?? ""}` }))}
            products={masters.products.filter((p) => p.isActive || lead.products.some((x) => x.id === p.id)).map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))}
            sources={masters.sources.filter((x) => x.isActive || x.id === lead.sourceId).map((x) => ({ id: x.id, name: x.name, isActive: x.isActive }))}
            valueLabel={formatLakh(lead.orderValueInr ?? lead.estimatedValueInr)}
          />
        </div>
      </div>
    </div>
  );
}
