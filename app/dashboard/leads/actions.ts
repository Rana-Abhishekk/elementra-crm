"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CallOutcome, LeadStage, LeadSource, LostReason, Priority, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/auth";
import { canEditLead, canReassign, isManager } from "@/lib/access";
import { writeAudit } from "@/lib/domain/audit";
import { ingestLead } from "@/lib/domain/leads/ingest";
import { rerouteLead } from "@/lib/domain/leads/reroute";
import { addNote, changeStage, logCall, setFollowUp } from "@/lib/domain/leads/workflow";
import { sendTemplate } from "@/lib/domain/messaging/send";
import { formatIST } from "@/lib/domain/time";
import { splitName } from "@/lib/domain/integrations/metaLead";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid input" : e instanceof Error ? e.message : "Something went wrong" });

async function editableLead(leadId: string): Promise<{ user: SessionUser; lead: NonNullable<Awaited<ReturnType<typeof prisma.lead.findUnique>>> }> {
  const user = await requireUser();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || !canEditLead(user, lead)) throw new Error("You can't edit this lead.");
  return { user, lead };
}

function refresh(leadId?: string) {
  revalidatePath("/dashboard", "layout");
  if (leadId) revalidatePath(`/dashboard/leads/${leadId}`);
}

// ---------- create ----------

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  siteAddress: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  products: z.array(z.enum(Product)),
  source: z.enum(LeadSource),
  priority: z.enum(Priority),
  language: z.enum(["en", "hi"]),
  notes: z.string().trim().optional(),
  architectId: z.string().optional(),
});

export async function createLeadAction(form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = createSchema.parse({
      name: form.get("name"),
      phone: form.get("phone") || undefined,
      email: form.get("email") || undefined,
      siteAddress: form.get("siteAddress") || undefined,
      pincode: form.get("pincode") || undefined,
      products: form.getAll("products"),
      source: form.get("source"),
      priority: form.get("priority") || "WARM",
      language: form.get("language") || "en",
      notes: form.get("notes") || undefined,
      architectId: form.get("architectId") || undefined,
    });
    const res = await ingestLead(
      { ...splitName(d.name), phone: d.phone, email: d.email, siteAddress: d.siteAddress, pincode: d.pincode, products: d.products, source: d.source, channel: "MANUAL", priority: d.priority, language: d.language, notes: d.notes, architectId: d.architectId },
      { actorId: user.id },
    );
    if (!res.ok) return { ok: false, error: res.error };
    refresh();
    return { ok: true, id: res.lead.id, message: `${res.lead.refCode}: ${res.decision.toast}` };
  } catch (e) {
    return fail(e);
  }
}

// ---------- stage ----------

const stageSchema = z.object({
  stage: z.enum(LeadStage),
  lostReason: z.enum(LostReason).nullish(),
  lostNote: z.string().trim().max(500).nullish(),
  reviveAt: z.coerce.date().nullish(),
  orderValueInr: z.coerce.number().int().nonnegative().nullish(),
});

export async function changeStageAction(leadId: string, input: z.input<typeof stageSchema>): Promise<ActionResult> {
  try {
    const { user } = await editableLead(leadId);
    const d = stageSchema.parse(input);
    const res = await changeStage(leadId, d.stage, { actorId: user.id, canReopen: isManager(user), lostReason: d.lostReason, lostNote: d.lostNote, reviveAt: d.reviveAt, orderValueInr: d.orderValueInr });
    refresh(leadId);
    return res;
  } catch (e) {
    return fail(e);
  }
}

// ---------- timeline composer ----------

export async function addNoteAction(leadId: string, body: string): Promise<ActionResult> {
  try {
    const { user } = await editableLead(leadId);
    const text = z.string().trim().min(1, "Write something first").max(4000).parse(body);
    const res = await addNote(leadId, text, user.id);
    refresh(leadId);
    return res;
  } catch (e) {
    return fail(e);
  }
}

export async function logCallAction(leadId: string, outcome: CallOutcome, note: string): Promise<ActionResult> {
  try {
    const { user } = await editableLead(leadId);
    const res = await logCall(leadId, z.enum(CallOutcome).parse(outcome), note.trim() || null, user.id);
    refresh(leadId);
    return res;
  } catch (e) {
    return fail(e);
  }
}

export async function setFollowUpAction(leadId: string, dueAtIso: string, note: string): Promise<ActionResult> {
  try {
    const { user } = await editableLead(leadId);
    const dueAt = z.coerce.date().parse(dueAtIso);
    const res = await setFollowUp(leadId, dueAt, note.trim() || null, user.id);
    refresh(leadId);
    return res;
  } catch (e) {
    return fail(e);
  }
}

export async function sendTemplateAction(leadId: string, templateCode: string, language: string): Promise<ActionResult> {
  try {
    const { user, lead } = await editableLead(leadId);
    if (!lead.phoneE164) return { ok: false, error: "This lead has no phone number." };
    const msg = await sendTemplate({ leadId, templateCode, language, sentById: user.id });
    if (!msg) return { ok: false, error: "Template not found." };
    await prisma.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } });
    refresh(leadId);
    revalidatePath("/dashboard/inbox");
    return { ok: true, message: "WhatsApp sent (simulator)" };
  } catch (e) {
    return fail(e);
  }
}

const apptSchema = z.object({ branchId: z.string().min(1), hostId: z.string().nullish(), scheduledAt: z.coerce.date(), notes: z.string().trim().max(500).nullish() });

export async function bookAppointmentAction(leadId: string, input: z.input<typeof apptSchema>): Promise<ActionResult> {
  try {
    const { user, lead } = await editableLead(leadId);
    const d = apptSchema.parse(input);
    const host = d.hostId ? await prisma.user.findUnique({ where: { id: d.hostId }, select: { name: true } }) : null;
    const branch = await prisma.branch.findUniqueOrThrow({ where: { id: d.branchId } });
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({ data: { leadId, branchId: d.branchId, hostId: d.hostId || null, scheduledAt: d.scheduledAt, notes: d.notes } });
      await tx.activity.create({
        data: { leadId, type: "APPOINTMENT", body: `Showroom visit booked: ${branch.name}, ${formatIST(d.scheduledAt, "EEE d MMM, h:mm a")}${host ? ` · host ${host.name}` : ""}`, userId: user.id, meta: { appointmentId: appt.id }, createdAt: now },
      });
      await tx.lead.update({ where: { id: leadId }, data: { lastActivityAt: now } });
      await writeAudit({ actorId: user.id, action: "appointment.booked", entityType: "Lead", entityId: leadId, summary: `${lead.refCode} visit booked for ${formatIST(d.scheduledAt)}` }, tx);
    });
    refresh(leadId);
    revalidatePath("/dashboard/appointments");
    return { ok: true, message: `Visit booked for ${formatIST(d.scheduledAt, "EEE d MMM, h:mm a")}` };
  } catch (e) {
    return fail(e);
  }
}

// ---------- details ----------

const detailsSchema = z.object({
  salutation: z.string().trim().max(10).nullish(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().nullish(),
  email: z.string().trim().nullish(),
  altPhoneE164: z.string().trim().nullish(),
  products: z.array(z.enum(Product)),
  priority: z.enum(Priority),
  language: z.enum(["en", "hi"]),
  possessionDate: z.coerce.date().nullish(),
  budgetNote: z.string().trim().nullish(),
  estimatedValueInr: z.coerce.number().int().nonnegative().nullish(),
  orderValueInr: z.coerce.number().int().nonnegative().nullish(),
  architectId: z.string().nullish(),
  architectCommissionPct: z.coerce.number().min(0).max(50).nullish(),
});

export async function updateLeadDetailsAction(leadId: string, input: z.input<typeof detailsSchema>): Promise<ActionResult> {
  try {
    const { user, lead } = await editableLead(leadId);
    const d = detailsSchema.parse(input);
    const changed = Object.entries(d).filter(([k, v]) => JSON.stringify((lead as Record<string, unknown>)[k] ?? null) !== JSON.stringify(v ?? null)).map(([k]) => k);
    await prisma.lead.update({ where: { id: leadId }, data: { ...d, email: d.email || null, architectId: d.architectId || null } });
    if (changed.length) {
      await writeAudit({ actorId: user.id, action: "lead.updated", entityType: "Lead", entityId: leadId, summary: `${lead.refCode} updated: ${changed.join(", ")}` });
    }
    refresh(leadId);
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

// ---------- routing ----------

export async function rerunRoutingAction(leadId: string, siteAddress: string, pincode: string): Promise<ActionResult> {
  try {
    const { user } = await editableLead(leadId);
    const res = await rerouteLead(leadId, { siteAddress: siteAddress.trim() || null, pincode: pincode.trim() || null }, user.id);
    refresh(leadId);
    return res.ok ? { ok: true, message: res.toast } : res;
  } catch (e) {
    return fail(e);
  }
}

/** Online Desk: type the area → instant handover */
export async function captureLocationAction(leadId: string, text: string): Promise<ActionResult> {
  try {
    const { user } = await editableLead(leadId);
    const value = z.string().trim().min(2, "Type an area or pincode").parse(text);
    const pin = value.match(/\b[1-9]\d{5}\b/)?.[0] ?? null;
    const res = await rerouteLead(leadId, { siteAddress: value, pincode: pin }, user.id);
    refresh(leadId);
    return res.ok ? { ok: true, message: res.toast } : res;
  } catch (e) {
    return fail(e);
  }
}

export async function reassignAction(leadId: string, ownerId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canReassign(user)) return { ok: false, error: "Only managers can reassign leads." };
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { branchId: true } });
    if (!owner.branchId) return { ok: false, error: "That person has no branch." };
    const res = await rerouteLead(leadId, { forceBranchId: owner.branchId, ownerId }, user.id);
    refresh(leadId);
    return res.ok ? { ok: true, message: res.toast } : res;
  } catch (e) {
    return fail(e);
  }
}

export async function bulkReassignAction(leadIds: string[], ownerId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canReassign(user)) return { ok: false, error: "Only managers can reassign leads." };
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { branchId: true, name: true } });
    if (!owner.branchId) return { ok: false, error: "That person has no branch." };
    for (const id of leadIds.slice(0, 200)) await rerouteLead(id, { forceBranchId: owner.branchId, ownerId }, user.id);
    refresh();
    return { ok: true, message: `${leadIds.length} lead(s) reassigned to ${owner.name}` };
  } catch (e) {
    return fail(e);
  }
}

export async function bulkFollowUpAction(leadIds: string[], dueAtIso: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const dueAt = z.coerce.date().parse(dueAtIso);
    let n = 0;
    for (const id of leadIds.slice(0, 200)) {
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (lead && canEditLead(user, lead) && (await setFollowUp(id, dueAt, null, user.id)).ok) n++;
    }
    refresh();
    return { ok: true, message: `Follow-up set on ${n} lead(s)` };
  } catch (e) {
    return fail(e);
  }
}

/** Out-of-area queue: accept for a branch */
export async function acceptOutOfAreaAction(leadId: string, branchId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!isManager(user)) return { ok: false, error: "Only managers can accept out-of-area leads." };
    const res = await rerouteLead(leadId, { forceBranchId: branchId }, user.id);
    refresh(leadId);
    return res.ok ? { ok: true, message: res.toast } : res;
  } catch (e) {
    return fail(e);
  }
}

/** Out-of-area queue: send the polite regret message and/or close as Lost – Others */
export async function regretOutOfAreaAction(leadId: string, sendMessage: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!isManager(user)) return { ok: false, error: "Only managers can close out-of-area leads." };
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    if (sendMessage && lead.phoneE164) await sendTemplate({ leadId, templateCode: "out_of_area_regret", sentById: user.id, dedupeKey: `REGRET:${leadId}` });
    const res = await changeStage(leadId, "CLOSED_LOST", { actorId: user.id, canReopen: true, lostReason: "OTHERS", lostNote: "Out of service area" });
    refresh(leadId);
    return res.ok ? { ok: true, message: sendMessage ? "Regret sent and closed" : "Closed as Lost – Others" } : res;
  } catch (e) {
    return fail(e);
  }
}
