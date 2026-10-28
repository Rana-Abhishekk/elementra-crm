"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AssignmentStrategy, TemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { getSettings, setSetting } from "@/lib/data/settings";
import { writeAudit } from "@/lib/domain/audit";
import type { Settings, SettingsKey } from "@/lib/domain/settings";
import { settingsSchema } from "@/lib/domain/settings";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e instanceof Error ? e.message : "Failed" });

/** Saves one settings section (merged over the current value) and audits the change. */
export async function saveSettingsAction<K extends SettingsKey>(key: K, patch: Partial<Settings[K]>): Promise<Result> {
  try {
    const user = await requireRole("OWNER", "ADMIN", "SALES_MANAGER");
    if (user.role === "SALES_MANAGER" && key !== "reminders") return { ok: false, error: "Only the owner or admin can change this." };
    const current = await getSettings();
    const next = settingsSchema.shape[key].parse({ ...(current[key] as object), ...(patch as object) }) as Settings[K];
    await setSetting(key, next, user.id);
    const changed = Object.keys(patch).filter((k) => JSON.stringify((current[key] as Record<string, unknown>)[k]) !== JSON.stringify((next as Record<string, unknown>)[k]));
    if (changed.length) {
      await writeAudit({ actorId: user.id, action: "settings.updated", entityType: "Setting", entityId: key, summary: `${key}: ${changed.map((c) => `${c} → ${JSON.stringify((next as Record<string, unknown>)[c])}`).join(", ")}`, diff: { before: current[key], after: next } as never });
    }
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

const branchSchema = z.object({ serviceRadiusKm: z.coerce.number().min(1).max(200), assignmentStrategy: z.enum(AssignmentStrategy) });

export async function saveBranchAction(branchId: string, input: z.input<typeof branchSchema>): Promise<Result> {
  try {
    const user = await requireRole("OWNER", "ADMIN");
    const d = branchSchema.parse(input);
    const b = await prisma.branch.update({ where: { id: branchId }, data: d });
    await writeAudit({ actorId: user.id, action: "branch.updated", entityType: "Branch", entityId: branchId, summary: `${b.name}: radius ${d.serviceRadiusKm} km, ${d.assignmentStrategy === "ROUND_ROBIN" ? "round-robin" : "fewest open leads"}` });
    revalidatePath("/dashboard/settings");
    return { ok: true, message: `${b.name} saved` };
  } catch (e) {
    return fail(e);
  }
}

export async function addPincodeRuleAction(pincode: string, branchId: string, label: string): Promise<Result> {
  try {
    const user = await requireRole("OWNER", "ADMIN");
    const pin = z.string().regex(/^[1-9]\d{5}$/, "A pincode has 6 digits").parse(pincode.trim());
    if (await prisma.branchPincode.findUnique({ where: { pincode: pin } })) return { ok: false, error: `${pin} already has a rule` };
    const b = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
    await prisma.branchPincode.create({ data: { pincode: pin, branchId, label: label.trim() || null } });
    await writeAudit({ actorId: user.id, action: "routing.rule_added", entityType: "BranchPincode", entityId: pin, summary: `Pincode ${pin} → ${b.name}` });
    revalidatePath("/dashboard/settings");
    return { ok: true, message: `Pincode ${pin} now goes to ${b.name}` };
  } catch (e) {
    return fail(e);
  }
}

export async function removePincodeRuleAction(id: string): Promise<Result> {
  try {
    const user = await requireRole("OWNER", "ADMIN");
    const r = await prisma.branchPincode.delete({ where: { id } });
    await writeAudit({ actorId: user.id, action: "routing.rule_removed", entityType: "BranchPincode", entityId: r.pincode, summary: `Pincode rule ${r.pincode} removed` });
    revalidatePath("/dashboard/settings");
    return { ok: true, message: `Rule for ${r.pincode} removed` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveTemplateAction(id: string, body: string, status: TemplateStatus): Promise<Result> {
  try {
    const user = await requireRole("OWNER", "ADMIN");
    const text = z.string().trim().min(5).max(1024).parse(body);
    const variables = [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
    const t = await prisma.messageTemplate.update({ where: { id }, data: { body: text, variables, status: z.enum(TemplateStatus).parse(status) } });
    await writeAudit({ actorId: user.id, action: "template.updated", entityType: "MessageTemplate", entityId: id, summary: `Template ${t.code} (${t.language}) updated` });
    revalidatePath("/dashboard/settings");
    return { ok: true, message: "Template saved" };
  } catch (e) {
    return fail(e);
  }
}

/** Integrations → "Send test webhook": checks the verify token and pushes one simulated lead through the webhook processor. */
export async function testMetaWebhookAction(): Promise<Result> {
  try {
    await requireRole("OWNER", "ADMIN");
    const { isDemoMode } = await import("@/lib/access");
    if (!process.env.META_VERIFY_TOKEN) return { ok: false, error: "META_VERIFY_TOKEN is not set" };
    if (!isDemoMode()) return { ok: true, message: "Verify token is set — Meta's handshake will succeed." };
    const { processLeadgenPayload, simulatedEnvelope } = await import("@/lib/domain/integrations/metaWebhook");
    const id = `SIM-TEST-${Date.now()}`;
    const [res] = await processLeadgenPayload(
      simulatedEnvelope({
        id,
        created_time: new Date().toISOString(),
        platform: "ig",
        campaign_name: "Webhook test",
        field_data: [
          { name: "full_name", values: ["Webhook Test"] },
          { name: "phone_number", values: [`+9190000${60000 + Math.floor(Math.random() * 9999)}`] },
          { name: "site_area", values: ["Andheri West"] },
        ],
      }),
    );
    revalidatePath("/dashboard", "layout");
    return res.ok ? { ok: true, message: `Handshake OK · test lead ${res.decision.refCode}: ${res.decision.toast}` } : { ok: false, error: res.error };
  } catch (e) {
    return fail(e);
  }
}
