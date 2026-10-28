"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isManager } from "@/lib/access";
import { recomputeNextFollowUp } from "@/lib/domain/leads/workflow";
import { friendlyIST } from "@/lib/domain/time";
import { TASK_TYPE_LABEL } from "@/lib/domain/labels";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function ownTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (task.assigneeId !== user.id && !isManager(user))) throw new Error("Task not found");
  return { user, task };
}

export async function completeTaskAction(taskId: string): Promise<Result> {
  try {
    const { user, task } = await ownTask(taskId);
    const now = new Date();
    await prisma.task.update({ where: { id: taskId }, data: { status: "DONE", completedAt: now } });
    if (task.leadId) {
      await prisma.activity.create({ data: { leadId: task.leadId, type: "TASK", body: `Done: ${task.title}`, userId: user.id, createdAt: now } });
      await prisma.lead.update({ where: { id: task.leadId }, data: { lastActivityAt: now } });
      await recomputeNextFollowUp(task.leadId);
    }
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: `${TASK_TYPE_LABEL[task.type]} done` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function snoozeTaskAction(taskId: string, untilIso: string): Promise<Result> {
  try {
    const { task } = await ownTask(taskId);
    const until = z.coerce.date().parse(untilIso);
    // Snoozed tasks sit in "Snoozed" until the time passes, then count as due from that time
    await prisma.task.update({ where: { id: taskId }, data: { snoozedUntil: until, status: "SNOOZED" } });
    if (task.leadId) await recomputeNextFollowUp(task.leadId);
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: `Snoozed until ${friendlyIST(until)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
