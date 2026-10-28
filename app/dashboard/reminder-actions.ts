"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/access";
import { runReminderEngine, summaryText, type EngineSummary } from "@/lib/domain/reminders/engine";

/** "Run reminders now" on the Demo panel and the Automations page */
export async function runRemindersNowAction(): Promise<{ ok: true; message: string; summary: EngineSummary } | { ok: false; error: string }> {
  try {
    await requireRole("OWNER", "ADMIN", "SALES_MANAGER");
    const summary = await runReminderEngine();
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: summaryText(summary), summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
