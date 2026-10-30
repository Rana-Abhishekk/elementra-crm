// Working a lead: stage changes, activities, follow-ups. Each writes a timeline entry + audit row.
import type { CallOutcome, Prisma, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/domain/audit";
import { CALL_OUTCOME_LABEL } from "@/lib/domain/labels";
import { canTransition, firstQualifiedStage, isOpen, mapStageToPipeline, openPhoneKey, stageByKey, type StageRef } from "@/lib/domain/stages";
import { formatIST, friendlyIST } from "@/lib/domain/time";
import { loadMasters } from "@/lib/data/masters";
import { isOpenPhoneConflict } from "./ingest";
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

/** Timeline meta for a stage move: labels are stored so history keeps the heading it had at the time. */
export const stageMeta = (from: StageRef, to: StageRef) => ({ fromStageId: from.id, toStageId: to.id, fromLabel: from.label, toLabel: to.label });

async function phoneConflictMessage(phone: string | null, leadId: string) {
  const other = phone ? await prisma.lead.findUnique({ where: { openPhoneKey: phone }, select: { id: true, refCode: true } }) : null;
  return other && other.id !== leadId ? `${other.refCode} is already the open lead for ${phone}. Close or merge it first.` : "Another open lead already uses this phone number.";
}

export async function changeStage(
  leadId: string,
  toStageId: string,
  opts: { actorId: string; canReopen: boolean; lostNote?: string | null; reviveAt?: Date | null; orderValueInr?: number | null },
  now = new Date(),
): Promise<Result> {
  const [lead, masters] = await Promise.all([prisma.lead.findUnique({ where: { id: leadId }, include: { branch: true } }), loadMasters()]);
  if (!lead) return { ok: false, error: "Lead not found" };
  const from = masters.stageById.get(lead.stageId)!;
  const to = masters.stageById.get(toStageId);
  if (!to) return { ok: false, error: "That stage doesn't exist any more." };
  if (to.pipelineId !== lead.pipelineId) return { ok: false, error: "That stage belongs to another pipeline. Move the lead to that pipeline first." };
  if (!canTransition(masters.stages, from, to, opts.canReopen)) {
    return { ok: false, error: isOpen(from) ? "Leads can move forward, one step back, or to Won/Lost." : "Only people allowed to reopen leads can move a closed lead back." };
  }
  if (to.requiresNote && !opts.lostNote?.trim()) return { ok: false, error: `Add a note for "${to.label}".` };

  const reviveAt = to.askReviveDate
    ? (opts.reviveAt ?? (lead.possessionDate ? new Date(lead.possessionDate.getTime() - 30 * 86400_000) : new Date(now.getTime() + 30 * 86400_000)))
    : null;
  const orderValue = to.category === "WON" ? (opts.orderValueInr ?? lead.orderValueInr ?? lead.estimatedValueInr ?? null) : lead.orderValueInr;
  const closed = !isOpen(to);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          stageId: to.id,
          openPhoneKey: openPhoneKey(to.category, lead.phoneE164),
          stageChangedAt: now,
          lastActivityAt: now,
          lostNote: closed ? (opts.lostNote ?? null) : null,
          reviveAt,
          orderValueInr: orderValue,
          ...(to.systemKey === "CONTACTED" && !lead.firstContactedAt ? { firstContactedAt: now } : {}),
        },
      });
      const extra =
        to.category === "LOST"
          ? `${opts.lostNote ? ` — ${opts.lostNote}` : ""}${reviveAt ? `. Revive reminder on ${formatIST(reviveAt, "d MMM yyyy")}.` : ""}`
          : to.category === "WON" && orderValue
            ? ` — order value ₹${orderValue.toLocaleString("en-IN")}`
            : opts.lostNote
              ? ` — ${opts.lostNote}`
              : "";
      await tx.activity.create({ data: { leadId, type: "STAGE_CHANGE", body: `Stage: ${from.label} → ${to.label}${extra}`, userId: opts.actorId, meta: stageMeta(from, to), createdAt: now } });

      if (closed) {
        await tx.task.updateMany({ where: { leadId, status: { in: ["OPEN", "SNOOZED"] } }, data: { status: "CANCELLED" } });
        await tx.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: null } });
      }
      if (to.category === "WON") await createDealAndProject(tx, leadId, orderValue, now);
      await writeAudit({ actorId: opts.actorId, action: "lead.stage_changed", entityType: "Lead", entityId: leadId, summary: `${lead.refCode} stage: ${from.label} → ${to.label}`, diff: stageMeta(from, to) }, tx);
    });
  } catch (e) {
    if (isOpenPhoneConflict(e)) return { ok: false, error: await phoneConflictMessage(lead.phoneE164, leadId) };
    throw e;
  }

  // Via-pre-sales mode: qualifying a located lead hands it over to the suggested branch
  if (to.id === firstQualifiedStage(masters.stages, lead.pipelineId)?.id && lead.branch?.kind === "ONLINE_DESK" && lead.locationStatus === "RESOLVED") {
    const res = await rerouteLead(leadId, {}, opts.actorId, now);
    if (res.ok) return { ok: true, message: res.toast };
  }
  return { ok: true, message: `Moved to ${to.label}` };
}

/** Move a lead to another pipeline: same category, nearest position (06 §4.2). */
export async function moveToPipeline(leadId: string, pipelineId: string, actorId: string, now = new Date()): Promise<Result> {
  const [lead, masters] = await Promise.all([prisma.lead.findUnique({ where: { id: leadId } }), loadMasters()]);
  if (!lead) return { ok: false, error: "Lead not found" };
  const target = masters.pipelineById.get(pipelineId);
  if (!target || !target.isActive) return { ok: false, error: "Pick an active pipeline." };
  if (lead.pipelineId === pipelineId) return { ok: false, error: "The lead is already in that pipeline." };
  const from = masters.stageById.get(lead.stageId)!;
  const to = mapStageToPipeline(masters.stages, from, pipelineId);
  if (!to) return { ok: false, error: `${target.name} has no active stages.` };
  const fromPipeline = masters.pipelineById.get(lead.pipelineId)?.name ?? "previous pipeline";
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { pipelineId, stageId: to.id, stageChangedAt: now, lastActivityAt: now } });
    await tx.activity.create({ data: { leadId, type: "STAGE_CHANGE", body: `Pipeline: ${fromPipeline} → ${target.name} · stage ${from.label} → ${to.label}`, userId: actorId, meta: stageMeta(from, to), createdAt: now } });
    await writeAudit({ actorId, action: "lead.pipeline_changed", entityType: "Lead", entityId: leadId, summary: `${lead.refCode} moved to ${target.name} (${to.label})` }, tx);
  });
  return { ok: true, message: `Moved to ${target.name} · ${to.label}` };
}

async function createDealAndProject(tx: Prisma.TransactionClient, leadId: string, orderValue: number | null, now: Date) {
  const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, include: { architect: { select: { companyId: true } }, products: { select: { name: true } } } });
  const product = lead.products.length ? lead.products.map((p) => p.name).join(" + ") : "Order";
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
  const [lead, masters] = await Promise.all([prisma.lead.findUniqueOrThrow({ where: { id: leadId } }), loadMasters()]);
  const stage = masters.stageById.get(lead.stageId)!;
  const contacted = stage.isInitial && outcome === "CONNECTED" ? stageByKey(masters.stages, lead.pipelineId, "CONTACTED") : null;
  const body = `Call: ${CALL_OUTCOME_LABEL[outcome]}${note ? ` — ${note}` : ""}`;
  let message = `Call logged: ${CALL_OUTCOME_LABEL[outcome]}`;
  await prisma.$transaction(async (tx) => {
    await tx.activity.create({ data: { leadId, type: "CALL", callOutcome: outcome, body, userId: actorId, createdAt: now } });
    await tx.lead.update({ where: { id: leadId }, data: { lastActivityAt: now, firstContactedAt: lead.firstContactedAt ?? now } });
    // The first-call task is done once someone has tried calling
    await tx.task.updateMany({ where: { leadId, status: { in: ["OPEN", "SNOOZED"] }, type: "FIRST_CALL" }, data: { status: "DONE", completedAt: now } });
    // Connected call on the starting stage → the stage keyed CONTACTED, when the pipeline has one
    if (contacted) {
      await tx.lead.update({ where: { id: leadId }, data: { stageId: contacted.id, stageChangedAt: now } });
      await tx.activity.create({ data: { leadId, type: "STAGE_CHANGE", body: `Stage: ${stage.label} → ${contacted.label} (call connected)`, userId: actorId, meta: stageMeta(stage, contacted), createdAt: new Date(now.getTime() + 1) } });
      message += ` · moved to ${contacted.label}`;
    }
    await recomputeNextFollowUp(leadId, tx);
  });
  return { ok: true, message };
}

/** Creates or moves the single open FOLLOW_UP task (spec §9.3). */
export async function setFollowUp(leadId: string, dueAt: Date, note: string | null, actorId: string, now = new Date()): Promise<Result> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { stage: { select: { category: true } } } });
  if (!isOpen(lead.stage)) return { ok: false, error: "Closed leads don't need follow-ups." };
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

