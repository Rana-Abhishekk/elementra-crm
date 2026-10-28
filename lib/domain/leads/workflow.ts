// Working a lead: stage changes, activities, follow-ups. Each writes a timeline entry + audit row.
import type { CallOutcome, LeadStage, LostReason, Prisma, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/domain/audit";
import { CALL_OUTCOME_LABEL, PRODUCT_LABEL } from "@/lib/domain/labels";
import { canTransition, isOpenStage, LOST_REASON_LABEL, stageLabel } from "@/lib/domain/stages";
import { formatIST, friendlyIST } from "@/lib/domain/time";
import { rerouteLead } from "./reroute";

type Db = Prisma.TransactionClient | typeof prisma;
export type Result = { ok: true; message?: string } | { ok: false; error: string };

const FOLLOW_UP_TYPES: TaskType[] = ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP", "CAPTURE_LOCATION", "REVIVE"];

/** nextFollowUpAt = earliest open follow-up-type task (null when none). */
export async function recomputeNextFollowUp(leadId: string, db: Db = prisma) {
  const next = await db.task.findFirst({
    where: { leadId, status: { in: ["OPEN", "SNOOZED"] }, type: { in: FOLLOW_UP_TYPES } },
    orderBy: { dueAt: "asc" },
    select: { dueAt: true, snoozedUntil: true },
  });
  await db.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: next ? (next.snoozedUntil ?? next.dueAt) : null } });
}

export async function changeStage(
  leadId: string,
  to: LeadStage,
  opts: { actorId: string; canReopen: boolean; lostReason?: LostReason | null; lostNote?: string | null; reviveAt?: Date | null; orderValueInr?: number | null },
  now = new Date(),
): Promise<Result> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { branch: true } });
  if (!lead) return { ok: false, error: "Lead not found" };
  if (!canTransition(lead.stage, to, opts.canReopen)) {
    return { ok: false, error: isOpenStage(lead.stage) ? "Leads can move forward, one step back, or to Won/Lost." : "Only managers can reopen a closed lead." };
  }
  if (to === "CLOSED_LOST" && !opts.lostReason) return { ok: false, error: "Choose a lost reason." };

  const from = stageLabel(lead.stage, lead.lostReason);
  const toLabel = stageLabel(to, opts.lostReason);
  let reviveAt: Date | null = null;
  if (to === "CLOSED_LOST" && (opts.lostReason === "ON_HOLD" || opts.lostReason === "TIMELINE")) {
    reviveAt =
      opts.reviveAt ?? (lead.possessionDate ? new Date(lead.possessionDate.getTime() - 30 * 86400_000) : new Date(now.getTime() + 30 * 86400_000));
  }
  const orderValue = to === "CLOSED_WON" ? (opts.orderValueInr ?? lead.orderValueInr ?? lead.estimatedValueInr ?? null) : lead.orderValueInr;

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        stage: to,
        stageChangedAt: now,
        lastActivityAt: now,
        lostReason: to === "CLOSED_LOST" ? opts.lostReason : null,
        lostNote: to === "CLOSED_LOST" ? (opts.lostNote ?? null) : null,
        reviveAt,
        orderValueInr: orderValue,
        ...(to === "CONTACTED" && !lead.firstContactedAt ? { firstContactedAt: now } : {}),
      },
    });
    const extra =
      to === "CLOSED_LOST"
        ? `${opts.lostNote ? ` — ${opts.lostNote}` : ""}${reviveAt ? `. Revive reminder on ${formatIST(reviveAt, "d MMM yyyy")}.` : ""}`
        : to === "CLOSED_WON" && orderValue
          ? ` — order value ₹${orderValue.toLocaleString("en-IN")}`
          : "";
    await tx.activity.create({ data: { leadId, type: "STAGE_CHANGE", body: `Stage: ${from} → ${toLabel}${extra}`, userId: opts.actorId, meta: { from: lead.stage, to }, createdAt: now } });

    if (!isOpenStage(to)) {
      await tx.task.updateMany({ where: { leadId, status: { in: ["OPEN", "SNOOZED"] } }, data: { status: "CANCELLED" } });
      await tx.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: null } });
    }
    if (to === "CLOSED_WON") await createDealAndProject(tx, leadId, orderValue, now);
    await writeAudit({ actorId: opts.actorId, action: "lead.stage_changed", entityType: "Lead", entityId: leadId, summary: `${lead.refCode} stage: ${from} → ${toLabel}` }, tx);
  });

  // Via-pre-sales mode: qualifying a located lead hands it over to the suggested branch
  if (to === "QUALIFIED" && lead.branch?.kind === "ONLINE_DESK" && lead.locationStatus === "RESOLVED") {
    const res = await rerouteLead(leadId, {}, opts.actorId, now);
    if (res.ok) return { ok: true, message: res.toast };
  }
  return { ok: true, message: `Moved to ${toLabel}` };
}

async function createDealAndProject(tx: Prisma.TransactionClient, leadId: string, orderValue: number | null, now: Date) {
  const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, include: { architect: { select: { companyId: true } } } });
  const product = lead.products.length ? lead.products.map((p) => PRODUCT_LABEL[p]).join(" + ") : "Kitchen";
  await tx.deal.upsert({
    where: { leadId },
    update: { stage: "WON", amount: (orderValue ?? 0) * 100, closeDate: now },
    create: {
      title: `${product} — ${lead.firstName} ${lead.lastName ?? ""}`.trim() + ` (${lead.refCode})`,
      amount: (orderValue ?? 0) * 100,
      stage: "WON",
      closeDate: now,
      contactId: lead.contactId,
      companyId: lead.architect?.companyId ?? null,
      ownerId: lead.ownerId,
      leadId,
      createdAt: now,
    },
  });
  if (lead.branchId) {
    await tx.project.upsert({
      where: { leadId },
      update: {},
      create: {
        leadId,
        branchId: lead.branchId,
        designerId: lead.ownerId,
        stage: "MEASUREMENT_REVERIFY",
        stageHistory: [{ stage: "MEASUREMENT_REVERIFY", at: now.toISOString() }],
        expectedHandoverAt: new Date(now.getTime() + 75 * 86400_000),
        createdAt: now,
      },
    });
  }
  await tx.activity.create({ data: { leadId, type: "SYSTEM", body: "Won → deal created and post-sale project opened (measurement re-verification).", createdAt: new Date(now.getTime() + 10) } });
}

export async function addNote(leadId: string, body: string, actorId: string, now = new Date()): Promise<Result> {
  await prisma.$transaction([
    prisma.activity.create({ data: { leadId, type: "NOTE", body, userId: actorId, createdAt: now } }),
    prisma.lead.update({ where: { id: leadId }, data: { lastActivityAt: now } }),
  ]);
  return { ok: true, message: "Note added" };
}

export async function logCall(leadId: string, outcome: CallOutcome, note: string | null, actorId: string, now = new Date()): Promise<Result> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const body = `Call: ${CALL_OUTCOME_LABEL[outcome]}${note ? ` — ${note}` : ""}`;
  let message = `Call logged: ${CALL_OUTCOME_LABEL[outcome]}`;
  await prisma.$transaction(async (tx) => {
    await tx.activity.create({ data: { leadId, type: "CALL", callOutcome: outcome, body, userId: actorId, createdAt: now } });
    await tx.lead.update({ where: { id: leadId }, data: { lastActivityAt: now, firstContactedAt: lead.firstContactedAt ?? now } });
    // The first-call task is done once someone has tried calling
    await tx.task.updateMany({ where: { leadId, status: { in: ["OPEN", "SNOOZED"] }, type: "FIRST_CALL" }, data: { status: "DONE", completedAt: now } });
    if (outcome === "CONNECTED" && lead.stage === "NEW") {
      await tx.lead.update({ where: { id: leadId }, data: { stage: "CONTACTED", stageChangedAt: now } });
      await tx.activity.create({ data: { leadId, type: "STAGE_CHANGE", body: `Stage: ${stageLabel("NEW")} → ${stageLabel("CONTACTED")} (call connected)`, userId: actorId, createdAt: new Date(now.getTime() + 1) } });
      message += " · moved to Contacted";
    }
    await recomputeNextFollowUp(leadId, tx);
  });
  return { ok: true, message };
}

/** Creates or moves the single open FOLLOW_UP task (spec §9.3). */
export async function setFollowUp(leadId: string, dueAt: Date, note: string | null, actorId: string, now = new Date()): Promise<Result> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (!isOpenStage(lead.stage)) return { ok: false, error: "Closed leads don't need follow-ups." };
  const assigneeId = lead.ownerId ?? actorId;
  const title = note?.trim() || `Follow up with ${lead.firstName}`;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({ where: { leadId, type: { in: ["FOLLOW_UP", "QUOTATION_FOLLOW_UP"] }, status: { in: ["OPEN", "SNOOZED"] } } });
    if (existing) {
      await tx.task.update({ where: { id: existing.id }, data: { dueAt, title, status: "OPEN", snoozedUntil: null, assigneeId } });
    } else {
      await tx.task.create({ data: { leadId, assigneeId, type: "FOLLOW_UP", title, dueAt, createdById: actorId } });
    }
    await tx.activity.create({ data: { leadId, type: "FOLLOW_UP_SET", body: `Next follow-up: ${friendlyIST(dueAt, now)}${note ? ` — ${note}` : ""}`, userId: actorId, createdAt: now } });
    await recomputeNextFollowUp(leadId, tx);
  });
  return { ok: true, message: `Follow-up set for ${friendlyIST(dueAt, now)}` };
}

export const LOST_REASON_OPTIONS = Object.entries(LOST_REASON_LABEL).map(([value, label]) => ({ value: value as LostReason, label }));
