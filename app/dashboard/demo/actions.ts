"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode, requirePermission } from "@/lib/auth";
import { runRandomBurst, runScenario, type ScenarioResult } from "@/lib/demo/scenarios";

async function guard() {
  if (!isDemoMode()) throw new Error("Demo mode is off");
  return requirePermission("demo.use");
}

export async function runScenarioAction(id: number): Promise<ScenarioResult> {
  try {
    const user = await guard();
    const res = await runScenario(id, user.id);
    revalidatePath("/dashboard", "layout");
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function randomBurstAction(): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  try {
    const user = await guard();
    const { summary } = await runRandomBurst(user.id);
    revalidatePath("/dashboard", "layout");
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function simulateSheetRowAction(): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const user = await guard();
    const { ingestLead } = await import("@/lib/domain/leads/ingest");
    const { mapSheetRow } = await import("@/lib/domain/integrations/sheets");
    const areas = ["Borivalli west", "Chembur", "Pimple Saudagar, Pune", "NA", "Kandiwali east", "Peddar Road"];
    const names = [["Ira", "Sawant"], ["Neel", "Gokhale"], ["Meher", "Vora"], ["Dhruv", "Bhatt"]];
    const [first, last] = names[Math.floor(Math.random() * names.length)];
    const input = mapSheetRow({
      "First Name": first,
      "Last Name": last,
      Phone: `90000${60000 + Math.floor(Math.random() * 9999)}`,
      "Site Address": areas[Math.floor(Math.random() * areas.length)],
      "Product/Solution": "Kitchen, Wardrobes",
      Source: "Instagram Paid Media",
      Remarks: "Added from the Online Sales Pipeline sheet",
    });
    const res = await ingestLead(input, { actorId: user.id });
    revalidatePath("/dashboard", "layout");
    return res.ok ? { ok: true, message: `Sheet row → ${res.lead.refCode}: ${res.decision.toast}` } : { ok: false, error: res.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function resetDemoAction(): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    await guard();
    const { clearDemoData, generateDemoHistory } = await import("@/lib/demo/generate");
    const { runReminderEngine } = await import("@/lib/domain/reminders/engine");
    await clearDemoData();
    await generateDemoHistory();
    await runReminderEngine();
    revalidatePath("/", "layout");
    return { ok: true, message: "Demo data reset — 180 fresh leads, dated relative to now." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
