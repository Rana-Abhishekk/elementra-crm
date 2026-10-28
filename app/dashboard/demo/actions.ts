"use server";

import { revalidatePath } from "next/cache";
import { requireRole, isDemoMode } from "@/lib/access";
import { runRandomBurst, runScenario, type ScenarioResult } from "@/lib/demo/scenarios";

async function guard() {
  if (!isDemoMode()) throw new Error("Demo mode is off");
  return requireRole("OWNER", "ADMIN");
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
