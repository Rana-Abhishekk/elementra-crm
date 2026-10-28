"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canEditLead } from "@/lib/access";
import { writeAudit } from "@/lib/domain/audit";
import { PROJECT_STAGES, PROJECT_STAGE_LABEL } from "@/lib/domain/labels";

export async function advanceProjectAction(projectId: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const p = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: { lead: true } });
    if (!canEditLead(user, p.lead)) return { ok: false, error: "You can't edit this project." };
    const i = PROJECT_STAGES.indexOf(p.stage);
    if (i >= PROJECT_STAGES.length - 1) return { ok: false, error: "Already handed over." };
    const next = PROJECT_STAGES[i + 1];
    const now = new Date();
    const history = [...((p.stageHistory as { stage: string; at: string }[]) ?? []), { stage: next, at: now.toISOString(), by: user.name }];
    const handover = next === "HANDOVER";
    await prisma.project.update({
      where: { id: projectId },
      data: {
        stage: next,
        stageHistory: history as Prisma.InputJsonValue,
        ...(handover ? { handoverAt: now, warrantyEndsAt: new Date(new Date(now).setMonth(now.getMonth() + 60)) } : {}),
      },
    });
    await prisma.activity.create({ data: { leadId: p.leadId, type: "SYSTEM", body: `Project: ${PROJECT_STAGE_LABEL[next]}${handover ? " — 5-year warranty starts today" : ""}`, userId: user.id, createdAt: now } });
    await writeAudit({ actorId: user.id, action: "project.advanced", entityType: "Lead", entityId: p.leadId, summary: `${p.lead.refCode} project → ${PROJECT_STAGE_LABEL[next]}` });
    revalidatePath("/dashboard/projects", "layout");
    return { ok: true, message: `Moved to ${PROJECT_STAGE_LABEL[next]}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
