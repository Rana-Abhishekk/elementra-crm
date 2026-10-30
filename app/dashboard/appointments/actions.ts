"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canEditLead } from "@/lib/auth/scope";
import { writeAudit } from "@/lib/domain/audit";
import { recomputeNextFollowUp } from "@/lib/domain/leads/workflow";
import { stageByKey } from "@/lib/domain/stages";
import { loadMasters } from "@/lib/data/masters";
import { stageMeta } from "@/lib/domain/leads/workflow";
import { addWorkingMinutes, formatIST } from "@/lib/domain/time";
import { getSettings } from "@/lib/data/settings";
import { shortBranch } from "@/lib/domain/routing/decide";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function load(appointmentId: string) {
  const user = await requireUser();
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { lead: true, branch: true, host: { select: { name: true } } } });
  if (!appt || !(appt.hostId === user.id || canEditLead(user, appt.lead))) throw new Error("Appointment not found");
  return { user, appt };
}

async function closeVisitTasks(appointmentId: string, now: Date) {
  await prisma.task.updateMany({ where: { dedupeKey: { in: [`R4:${appointmentId}`, `R5:${appointmentId}`] }, status: { in: ["OPEN", "SNOOZED"] } }, data: { status: "DONE", completedAt: now } });
}

export async function markVisitedAction(appointmentId: string): Promise<Result> {
  try {
    const { user, appt } = await load(appointmentId);
    const now = new Date();
    // A visit moves earlier open stages to the stage keyed DISCOVERY_MEETING (if the pipeline has one)
    const masters = await loadMasters();
    const current = masters.stageById.get(appt.lead.stageId)!;
    const discovery = stageByKey(masters.stages, appt.lead.pipelineId, "DISCOVERY_MEETING");
    const moveStage = !!discovery && current.category === "OPEN" && current.sortOrder < discovery.sortOrder;
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id: appointmentId }, data: { status: "VISITED" } });
      await tx.activity.create({ data: { leadId: appt.leadId, type: "SHOWROOM_VISIT", body: `Visited ${appt.branch.name}${appt.host ? ` (hosted by ${appt.host.name})` : ""}.`, userId: user.id, createdAt: now } });
      if (moveStage && discovery) {
        await tx.lead.update({ where: { id: appt.leadId }, data: { stageId: discovery.id, stageChangedAt: now } });
        await tx.activity.create({ data: { leadId: appt.leadId, type: "STAGE_CHANGE", body: `Stage: ${current.label} → ${discovery.label} (showroom visit)`, userId: user.id, meta: stageMeta(current, discovery), createdAt: new Date(now.getTime() + 10) } });
      }
      await tx.lead.update({ where: { id: appt.leadId }, data: { lastActivityAt: now } });
      await writeAudit({ actorId: user.id, action: "appointment.visited", entityType: "Lead", entityId: appt.leadId, summary: `${appt.lead.refCode} visited ${shortBranch(appt.branch.name)}` }, tx);
    });
    await closeVisitTasks(appointmentId, now);
    await recomputeNextFollowUp(appt.leadId);
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: `Marked visited${moveStage && discovery ? ` · moved to ${discovery.label}` : ""}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function markNoShowAction(appointmentId: string): Promise<Result> {
  try {
    const { user, appt } = await load(appointmentId);
    const now = new Date();
    const settings = await getSettings();
    await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "NO_SHOW" } });
    await prisma.activity.create({ data: { leadId: appt.leadId, type: "APPOINTMENT", body: `No-show at ${appt.branch.name} (${formatIST(appt.scheduledAt)}).`, userId: user.id, createdAt: now } });
    if (appt.lead.ownerId) {
      await prisma.task.create({
        data: { leadId: appt.leadId, assigneeId: appt.lead.ownerId, type: "FOLLOW_UP", title: `Call ${appt.lead.firstName} to reschedule the showroom visit`, dueAt: addWorkingMinutes(now, 60, settings.workingHours), createdById: user.id },
      });
    }
    await closeVisitTasks(appointmentId, now);
    await recomputeNextFollowUp(appt.leadId);
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Marked no-show · reschedule call added" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function rescheduleAction(appointmentId: string, whenIso: string): Promise<Result> {
  try {
    const { user, appt } = await load(appointmentId);
    const when = z.coerce.date().parse(whenIso);
    const now = new Date();
    // A new appointment, so the 24 h reminder (R4) fires again for the new time
    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointmentId }, data: { status: "RESCHEDULED" } }),
      prisma.appointment.create({ data: { leadId: appt.leadId, branchId: appt.branchId, hostId: appt.hostId, scheduledAt: when, notes: appt.notes } }),
      prisma.activity.create({ data: { leadId: appt.leadId, type: "APPOINTMENT", body: `Showroom visit moved: ${formatIST(appt.scheduledAt)} → ${formatIST(when)}`, userId: user.id, createdAt: now } }),
    ]);
    await closeVisitTasks(appointmentId, now);
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: `Rescheduled to ${formatIST(when)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
