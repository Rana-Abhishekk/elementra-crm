"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canSeeLead, isDemoMode } from "@/lib/access";
import { simulateCustomerReply } from "@/lib/domain/messaging/replies";

export async function simulateReplyAction(leadId?: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    if (!isDemoMode()) return { ok: false, error: "Simulated replies are only available in demo mode." };
    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || !canSeeLead(user, lead)) return { ok: false, error: "Lead not found" };
    }
    const res = await simulateCustomerReply(leadId);
    if (!res) return { ok: false, error: "No conversation to reply to yet." };
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: `${res.lead.firstName} replied: “${res.body}”` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
