"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { canSeeUser } from "@/lib/auth/scope";
import { writeAudit } from "@/lib/domain/audit";
import { formatISTDate } from "@/lib/domain/time";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function editableMember(userId: string) {
  const actor = await requirePermission("users.manage");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  // Managers manage people in their own branches only (userWhere)
  if (!member || !canSeeUser(actor, member)) throw new Error("User not found.");
  return { actor, member };
}

export async function setOnLeaveAction(userId: string, onLeave: boolean, untilIso?: string | null): Promise<Result> {
  try {
    const { actor, member } = await editableMember(userId);
    const until = onLeave && untilIso ? z.coerce.date().parse(untilIso) : null;
    await prisma.user.update({ where: { id: userId }, data: { onLeave, onLeaveUntil: until } });
    const summary = onLeave ? `${member.name} on leave${until ? ` until ${formatISTDate(until)}` : ""}` : `${member.name} back from leave`;
    await writeAudit({ actorId: actor.id, action: onLeave ? "user.on_leave" : "user.back", entityType: "User", entityId: userId, summary });
    revalidatePath("/dashboard/team");
    return { ok: true, message: `${summary}${onLeave ? " — skipped for new leads" : " — back in the rotation"}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function setReceivesLeadsAction(userId: string, value: boolean): Promise<Result> {
  try {
    const { actor, member } = await editableMember(userId);
    await prisma.user.update({ where: { id: userId }, data: { receivesLeads: value } });
    await writeAudit({ actorId: actor.id, action: "user.receives_leads", entityType: "User", entityId: userId, summary: `${member.name} ${value ? "receives" : "no longer receives"} new leads` });
    revalidatePath("/dashboard/team");
    return { ok: true, message: `${member.name} ${value ? "now receives" : "won't receive"} new leads` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
