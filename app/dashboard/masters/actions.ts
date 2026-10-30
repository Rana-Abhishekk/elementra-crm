"use server";

// Masters admin (06 §4): sources, products, pipelines & stages, branches. Every change is audited with
// before → after. Values that are in use are never hard-deleted: deactivate or merge instead.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AssignmentStrategy, BranchKind, Prisma, StageCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/domain/audit";
import { validatePipelineStages } from "@/lib/domain/stages";

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const fail = (e: unknown): Result => {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "That name is already used." };
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
};

const refresh = () => revalidatePath("/dashboard", "layout");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour");
const name = z.string().trim().min(1, "Name is required").max(80);
const keys = z.array(z.string().trim().min(1).max(120)).max(30);
const audit = (actorId: string, action: string, entityType: string, entityId: string, summary: string, before?: unknown, after?: unknown) =>
  writeAudit({ actorId, action, entityType, entityId, summary, diff: { before: before ?? null, after: after ?? null } as Prisma.InputJsonValue });

type Kind = "source" | "product";

async function usage(kind: Kind, id: string) {
  return kind === "source" ? prisma.lead.count({ where: { sourceId: id } }) : prisma.lead.count({ where: { products: { some: { id } } } });
}

// ---------- sources ----------

const sourceSchema = z.object({ name, color: hex, isPaid: z.boolean(), integrationKeys: keys });

export async function saveSourceAction(id: string | null, input: z.input<typeof sourceSchema>): Promise<Result> {
  try {
    const user = await requirePermission("masters.manage");
    const d = sourceSchema.parse(input);
    const integrationKeys = [...new Set(d.integrationKeys)];
    // An integration key may point at one source only, or incoming leads would be ambiguous
    const clash = await prisma.source.findFirst({ where: { integrationKeys: { hasSome: integrationKeys }, ...(id ? { NOT: { id } } : {}) }, select: { name: true, integrationKeys: true } });
    if (clash) return { ok: false, error: `Key "${integrationKeys.find((k) => clash.integrationKeys.includes(k))}" already maps to ${clash.name}.` };
    if (id) {
      const before = await prisma.source.findUniqueOrThrow({ where: { id } });
      const after = await prisma.source.update({ where: { id }, data: { ...d, integrationKeys } });
      await audit(user.id, "master.source_updated", "Source", id, `Source "${before.name}" updated${before.name !== after.name ? ` → "${after.name}"` : ""}`, before, after);
    } else {
      const max = await prisma.source.aggregate({ _max: { sortOrder: true } });
      const created = await prisma.source.create({ data: { ...d, integrationKeys, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
      await audit(user.id, "master.source_created", "Source", created.id, `Source "${created.name}" added`, null, created);
      id = created.id;
    }
    refresh();
    return { ok: true, message: "Source saved", id };
  } catch (e) {
    return fail(e);
  }
}

// ---------- products ----------

const productSchema = z.object({ name, metaAnswerKeys: keys });

export async function saveProductAction(id: string | null, input: z.input<typeof productSchema>): Promise<Result> {
  try {
    const user = await requirePermission("masters.manage");
    const d = productSchema.parse(input);
    const metaAnswerKeys = [...new Set(d.metaAnswerKeys.map((k) => k.toLowerCase()))];
    if (id) {
      const before = await prisma.product.findUniqueOrThrow({ where: { id } });
      const after = await prisma.product.update({ where: { id }, data: { name: d.name, metaAnswerKeys } });
      await audit(user.id, "master.product_updated", "Product", id, `Product "${before.name}" updated${before.name !== after.name ? ` → "${after.name}"` : ""}`, before, after);
    } else {
      const max = await prisma.product.aggregate({ _max: { sortOrder: true } });
      const created = await prisma.product.create({ data: { name: d.name, metaAnswerKeys, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
      await audit(user.id, "master.product_created", "Product", created.id, `Product "${created.name}" added`, null, created);
      id = created.id;
    }
    refresh();
    return { ok: true, message: "Product saved", id };
  } catch (e) {
    return fail(e);
  }
}

// ---------- shared: active / order / merge / delete ----------

export async function setMasterActiveAction(kind: Kind, id: string, isActive: boolean): Promise<Result> {
  try {
    const user = await requirePermission("masters.manage");
    if (kind === "source") {
      const s = await prisma.source.findUniqueOrThrow({ where: { id } });
      if (!isActive && s.isFallback) return { ok: false, error: `"${s.name}" catches unmapped leads, so it must stay active.` };
      await prisma.source.update({ where: { id }, data: { isActive } });
      await audit(user.id, isActive ? "master.source_activated" : "master.source_deactivated", "Source", id, `Source "${s.name}" ${isActive ? "activated" : "deactivated"}`, { isActive: !isActive }, { isActive });
    } else {
      const p = await prisma.product.findUniqueOrThrow({ where: { id } });
      if (!isActive && (await prisma.product.count({ where: { isActive: true } })) <= 1) return { ok: false, error: "Keep at least one active product." };
      await prisma.product.update({ where: { id }, data: { isActive } });
      await audit(user.id, isActive ? "master.product_activated" : "master.product_deactivated", "Product", id, `Product "${p.name}" ${isActive ? "activated" : "deactivated"}`, { isActive: !isActive }, { isActive });
    }
    refresh();
    return { ok: true, message: isActive ? "Activated" : "Deactivated — hidden from dropdowns; existing leads keep it" };
  } catch (e) {
    return fail(e);
  }
}

export async function moveMasterAction(kind: Kind, id: string, dir: -1 | 1): Promise<Result> {
  try {
    await requirePermission("masters.manage");
    const rows = kind === "source" ? await prisma.source.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } }) : await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await prisma.$transaction(ids.map((rid, k) => (kind === "source" ? prisma.source.update({ where: { id: rid }, data: { sortOrder: k + 1 } }) : prisma.product.update({ where: { id: rid }, data: { sortOrder: k + 1 } }))));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Moves every reference from `fromId` to `toId`, then deactivates `fromId`. */
export async function mergeMasterAction(kind: Kind, fromId: string, toId: string): Promise<Result> {
  try {
    const user = await requirePermission("masters.manage");
    if (fromId === toId) return { ok: false, error: "Pick a different value to merge into." };
    if (kind === "source") {
      const [from, to] = await Promise.all([prisma.source.findUniqueOrThrow({ where: { id: fromId } }), prisma.source.findUniqueOrThrow({ where: { id: toId } })]);
      if (from.isFallback) return { ok: false, error: `"${from.name}" catches unmapped leads and can't be merged away.` };
      const moved = await prisma.$transaction(async (tx) => {
        const r = await tx.lead.updateMany({ where: { sourceId: fromId }, data: { sourceId: toId } });
        // The merged source's integration keys now point to the target
        await tx.source.update({ where: { id: toId }, data: { integrationKeys: [...new Set([...to.integrationKeys, ...from.integrationKeys])] } });
        await tx.source.update({ where: { id: fromId }, data: { isActive: false, integrationKeys: [] } });
        return r.count;
      });
      await audit(user.id, "master.source_merged", "Source", fromId, `Source "${from.name}" merged into "${to.name}" (${moved} leads moved)`, from, { mergedInto: to.id, leadsMoved: moved });
      refresh();
      return { ok: true, message: `${moved} lead(s) moved to ${to.name}; "${from.name}" deactivated` };
    }
    const [from, to] = await Promise.all([prisma.product.findUniqueOrThrow({ where: { id: fromId } }), prisma.product.findUniqueOrThrow({ where: { id: toId } })]);
    const moved = await prisma.$transaction(async (tx) => {
      const n = await tx.$executeRaw`INSERT INTO "_LeadProducts" ("A", "B") SELECT "A", ${toId} FROM "_LeadProducts" WHERE "B" = ${fromId} ON CONFLICT DO NOTHING`;
      await tx.$executeRaw`DELETE FROM "_LeadProducts" WHERE "B" = ${fromId}`;
      await tx.$executeRaw`INSERT INTO "_PipelineAutoProducts" ("A", "B") SELECT "A", ${toId} FROM "_PipelineAutoProducts" WHERE "B" = ${fromId} ON CONFLICT DO NOTHING`;
      await tx.$executeRaw`DELETE FROM "_PipelineAutoProducts" WHERE "B" = ${fromId}`;
      await tx.product.update({ where: { id: toId }, data: { metaAnswerKeys: [...new Set([...to.metaAnswerKeys, ...from.metaAnswerKeys])] } });
      await tx.product.update({ where: { id: fromId }, data: { isActive: false, metaAnswerKeys: [] } });
      return n;
    });
    await audit(user.id, "master.product_merged", "Product", fromId, `Product "${from.name}" merged into "${to.name}" (${moved} leads updated)`, from, { mergedInto: to.id, leadsMoved: moved });
    refresh();
    return { ok: true, message: `"${from.name}" merged into ${to.name}` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMasterAction(kind: Kind, id: string): Promise<Result> {
  try {
    const user = await requirePermission("masters.manage");
    const used = await usage(kind, id);
    if (used > 0) return { ok: false, error: `Used by ${used} lead(s). Deactivate it or merge it into another value instead.` };
    if (kind === "source") {
      const s = await prisma.source.findUniqueOrThrow({ where: { id } });
      if (s.isFallback) return { ok: false, error: `"${s.name}" catches unmapped leads and can't be deleted.` };
      await prisma.source.delete({ where: { id } });
      await audit(user.id, "master.source_deleted", "Source", id, `Source "${s.name}" deleted (unused)`, s, null);
    } else {
      const p = await prisma.product.findUniqueOrThrow({ where: { id } });
      await prisma.product.delete({ where: { id } });
      await audit(user.id, "master.product_deleted", "Product", id, `Product "${p.name}" deleted (unused)`, p, null);
    }
    refresh();
    return { ok: true, message: "Deleted" };
  } catch (e) {
    return fail(e);
  }
}

// ---------- pipelines ----------

const pipelineSchema = z.object({ name, description: z.string().trim().max(300).nullish(), autoProductIds: z.array(z.string()).max(50), isActive: z.boolean() });

export async function savePipelineAction(id: string | null, input: z.input<typeof pipelineSchema>): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const d = pipelineSchema.parse(input);
    const data = { name: d.name, description: d.description || null, isActive: d.isActive, autoProducts: { set: d.autoProductIds.map((pid) => ({ id: pid })) } };
    if (id) {
      const before = await prisma.pipeline.findUniqueOrThrow({ where: { id }, include: { autoProducts: { select: { name: true } } } });
      if (before.isDefault && !d.isActive) return { ok: false, error: "The default pipeline can't be deactivated. Make another one the default first." };
      const after = await prisma.pipeline.update({ where: { id }, data, include: { autoProducts: { select: { name: true } } } });
      await audit(user.id, "master.pipeline_updated", "Pipeline", id, `Pipeline "${before.name}" updated`, before, after);
    } else {
      const max = await prisma.pipeline.aggregate({ _max: { sortOrder: true } });
      // A new pipeline starts valid: one starting stage, one Won and one Lost stage
      const created = await prisma.pipeline.create({
        data: {
          name: d.name,
          description: d.description || null,
          isActive: d.isActive,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          autoProducts: { connect: d.autoProductIds.map((pid) => ({ id: pid })) },
          stages: {
            create: [
              { label: "New enquiry", category: "OPEN", sortOrder: 1, isInitial: true, color: "#64748B" },
              { label: "Won", category: "WON", sortOrder: 2, color: "#10B981" },
              { label: "Lost", category: "LOST", sortOrder: 3, color: "#E11D48" },
            ],
          },
        },
      });
      await audit(user.id, "master.pipeline_created", "Pipeline", created.id, `Pipeline "${created.name}" added`, null, created);
      id = created.id;
    }
    refresh();
    return { ok: true, message: "Pipeline saved", id };
  } catch (e) {
    return fail(e);
  }
}

export async function duplicatePipelineAction(id: string): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const src = await prisma.pipeline.findUniqueOrThrow({ where: { id }, include: { stages: true } });
    let copyName = `${src.name} (copy)`;
    for (let n = 2; await prisma.pipeline.findUnique({ where: { name: copyName } }); n++) copyName = `${src.name} (copy ${n})`;
    const max = await prisma.pipeline.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.pipeline.create({
      data: {
        name: copyName,
        description: src.description,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        stages: {
          create: src.stages.map((st) => ({
            label: st.label,
            category: st.category,
            sortOrder: st.sortOrder,
            color: st.color,
            isInitial: st.isInitial,
            isActive: st.isActive,
            requiresQualification: st.requiresQualification,
            askReviveDate: st.askReviveDate,
            requiresNote: st.requiresNote,
            staleDays: st.staleDays,
            staleTaskType: st.staleTaskType,
            probability: st.probability,
            systemKey: st.systemKey,
          })),
        },
      },
    });
    await audit(user.id, "master.pipeline_created", "Pipeline", created.id, `Pipeline "${created.name}" copied from "${src.name}"`, null, { copiedFrom: src.id });
    refresh();
    return { ok: true, message: `Created "${copyName}"`, id: created.id };
  } catch (e) {
    return fail(e);
  }
}

export async function setDefaultPipelineAction(id: string): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const p = await prisma.pipeline.findUniqueOrThrow({ where: { id } });
    if (!p.isActive) return { ok: false, error: "Activate the pipeline first." };
    const before = await prisma.pipeline.findFirst({ where: { isDefault: true } });
    await prisma.$transaction([prisma.pipeline.updateMany({ data: { isDefault: false } }), prisma.pipeline.update({ where: { id }, data: { isDefault: true } })]);
    await audit(user.id, "master.pipeline_default", "Pipeline", id, `Default pipeline: ${before?.name ?? "—"} → ${p.name}`, { default: before?.name }, { default: p.name });
    refresh();
    return { ok: true, message: `${p.name} is now the default pipeline` };
  } catch (e) {
    return fail(e);
  }
}

export async function movePipelineAction(id: string, dir: -1 | 1): Promise<Result> {
  try {
    await requirePermission("pipelines.manage");
    const ids = (await prisma.pipeline.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } })).map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await prisma.$transaction(ids.map((pid, k) => prisma.pipeline.update({ where: { id: pid }, data: { sortOrder: k } })));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- stages (the "status master") ----------

const stageSchema = z.object({
  label: z.string().trim().min(1, "The heading can't be empty").max(80),
  category: z.enum(StageCategory),
  color: hex,
  isInitial: z.boolean(),
  isActive: z.boolean(),
  requiresQualification: z.boolean(),
  askReviveDate: z.boolean(),
  requiresNote: z.boolean(),
  staleDays: z.number().int().min(1).max(365).nullable(),
  staleTaskType: z.enum(["FOLLOW_UP", "QUOTATION_FOLLOW_UP"]).nullable(),
  probability: z.number().int().min(0).max(100).nullable(),
});

type StageInput = z.input<typeof stageSchema>;

export async function saveStageAction(pipelineId: string, stageId: string | null, input: StageInput): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const d = stageSchema.parse(input);
    const stages = await prisma.pipelineStage.findMany({ where: { pipelineId }, orderBy: { sortOrder: "asc" } });
    const before = stageId ? stages.find((s) => s.id === stageId) : null;
    if (stageId && !before) return { ok: false, error: "Stage not found." };
    const flags = {
      ...d,
      askReviveDate: d.category === "LOST" && d.askReviveDate,
      requiresQualification: d.category === "OPEN" && d.requiresQualification,
      isInitial: d.category === "OPEN" && d.isInitial,
      staleDays: d.category === "OPEN" ? d.staleDays : null,
      staleTaskType: d.category === "OPEN" && d.staleDays ? (d.staleTaskType ?? "FOLLOW_UP") : null,
    };
    if (before) {
      const leads = await prisma.lead.count({ where: { stageId: before.id } });
      if (leads && before.isActive && !flags.isActive) return { ok: false, error: `${leads} lead(s) are in "${before.label}". Merge them into another stage first.` };
      // Changing open ↔ closed would silently close or reopen the leads sitting here
      if (leads && before.category !== flags.category) return { ok: false, error: `${leads} lead(s) are in "${before.label}", so its category can't change. Merge them into another stage first.` };
    }
    // Validate the pipeline as it would look after the change; a new starting stage replaces the old one
    const prospective = [
      ...stages.filter((s) => s.id !== stageId).map((s) => ({ ...s, isInitial: flags.isInitial ? false : s.isInitial })),
      { id: stageId ?? "new", label: flags.label, category: flags.category, isActive: flags.isActive, isInitial: flags.isInitial },
    ];
    const errors = validatePipelineStages(prospective);
    if (errors.length) return { ok: false, error: errors[0] };

    const saved = await prisma.$transaction(async (tx) => {
      if (flags.isInitial) await tx.pipelineStage.updateMany({ where: { pipelineId, isInitial: true, NOT: stageId ? { id: stageId } : undefined }, data: { isInitial: false } });
      if (before) return tx.pipelineStage.update({ where: { id: before.id }, data: flags });
      // New stages go to the end of their category block (before Won/Lost for Open stages)
      const sortOrder = flags.category === "OPEN" ? Math.max(0, ...stages.filter((s) => s.category === "OPEN").map((s) => s.sortOrder)) + 1 : Math.max(0, ...stages.map((s) => s.sortOrder)) + 1;
      await tx.pipelineStage.updateMany({ where: { pipelineId, sortOrder: { gte: sortOrder } }, data: { sortOrder: { increment: 1 } } });
      return tx.pipelineStage.create({ data: { ...flags, pipelineId, sortOrder } });
    });
    const pipeline = await prisma.pipeline.findUniqueOrThrow({ where: { id: pipelineId }, select: { name: true } });
    await audit(
      user.id,
      before ? "master.stage_updated" : "master.stage_created",
      "PipelineStage",
      saved.id,
      before ? `${pipeline.name}: stage "${before.label}"${before.label !== saved.label ? ` renamed to "${saved.label}"` : " updated"}` : `${pipeline.name}: stage "${saved.label}" added`,
      before,
      saved,
    );
    refresh();
    return { ok: true, message: before ? "Stage saved — every screen now shows the new settings" : `"${saved.label}" added`, id: saved.id };
  } catch (e) {
    return fail(e);
  }
}

export async function moveStageAction(stageId: string, dir: -1 | 1): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const stage = await prisma.pipelineStage.findUniqueOrThrow({ where: { id: stageId } });
    const ids = (await prisma.pipelineStage.findMany({ where: { pipelineId: stage.pipelineId }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((s) => s.id);
    const i = ids.indexOf(stageId);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await prisma.$transaction(ids.map((sid, k) => prisma.pipelineStage.update({ where: { id: sid }, data: { sortOrder: k + 1 } })));
    await audit(user.id, "master.stage_reordered", "PipelineStage", stageId, `Stage "${stage.label}" moved ${dir < 0 ? "up" : "down"}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Moves every lead from one stage to another of the same pipeline and category, then deactivates the source stage. */
export async function mergeStageAction(fromId: string, toId: string): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const [from, to] = await Promise.all([prisma.pipelineStage.findUniqueOrThrow({ where: { id: fromId } }), prisma.pipelineStage.findUniqueOrThrow({ where: { id: toId } })]);
    if (from.id === to.id) return { ok: false, error: "Pick a different stage." };
    if (from.pipelineId !== to.pipelineId) return { ok: false, error: "Stages must be in the same pipeline." };
    if (from.category !== to.category) return { ok: false, error: "Merge into a stage of the same kind (Open → Open, Lost → Lost), so no lead is closed or reopened by accident." };
    if (!to.isActive) return { ok: false, error: `"${to.label}" is inactive.` };
    const stages = await prisma.pipelineStage.findMany({ where: { pipelineId: from.pipelineId } });
    const errors = validatePipelineStages(stages.map((s) => (s.id === from.id ? { ...s, isActive: false, isInitial: false } : s.id === to.id && from.isInitial ? { ...s, isInitial: true } : s)));
    if (errors.length) return { ok: false, error: errors[0] };
    const now = new Date();
    const moved = await prisma.$transaction(async (tx) => {
      const leads = await tx.lead.findMany({ where: { stageId: fromId }, select: { id: true } });
      await tx.lead.updateMany({ where: { stageId: fromId }, data: { stageId: toId } });
      if (leads.length) {
        await tx.activity.createMany({
          data: leads.map((l) => ({ leadId: l.id, type: "STAGE_CHANGE" as const, body: `Stage: ${from.label} → ${to.label} (stages merged by ${user.name})`, userId: user.id, meta: { fromStageId: from.id, toStageId: to.id, fromLabel: from.label, toLabel: to.label, merge: true }, createdAt: now })),
        });
      }
      await tx.pipelineStage.update({ where: { id: fromId }, data: { isActive: false, isInitial: false } });
      if (from.isInitial) await tx.pipelineStage.update({ where: { id: toId }, data: { isInitial: true } });
      return leads.length;
    });
    await audit(user.id, "master.stage_merged", "PipelineStage", fromId, `Stage "${from.label}" merged into "${to.label}" (${moved} leads moved)`, from, { mergedInto: to.id, leadsMoved: moved });
    refresh();
    return { ok: true, message: `${moved} lead(s) moved to "${to.label}"; "${from.label}" deactivated` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteStageAction(stageId: string): Promise<Result> {
  try {
    const user = await requirePermission("pipelines.manage");
    const stage = await prisma.pipelineStage.findUniqueOrThrow({ where: { id: stageId } });
    const leads = await prisma.lead.count({ where: { stageId } });
    if (leads) return { ok: false, error: `${leads} lead(s) are in "${stage.label}". Merge them into another stage first.` };
    const rest = await prisma.pipelineStage.findMany({ where: { pipelineId: stage.pipelineId, NOT: { id: stageId } } });
    const errors = validatePipelineStages(rest);
    if (errors.length) return { ok: false, error: errors[0] };
    await prisma.pipelineStage.delete({ where: { id: stageId } });
    await audit(user.id, "master.stage_deleted", "PipelineStage", stageId, `Stage "${stage.label}" deleted (no leads)`, stage, null);
    refresh();
    return { ok: true, message: "Stage deleted" };
  } catch (e) {
    return fail(e);
  }
}

// ---------- branches ----------

const branchSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,6}$/, "Code: 2–6 letters or digits"),
  name,
  kind: z.enum(BranchKind),
  city: z.string().trim().min(1, "City is required").max(60),
  area: z.string().trim().max(120).nullish(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  serviceRadiusKm: z.number().min(1).max(300),
  assignmentStrategy: z.enum(AssignmentStrategy),
  isActive: z.boolean(),
});

export async function saveBranchMasterAction(id: string | null, input: z.input<typeof branchSchema>): Promise<Result> {
  try {
    const user = await requirePermission("branches.manage");
    const d = branchSchema.parse(input);
    if (d.kind === "EXPERIENCE_CENTRE" && d.isActive && (d.lat == null || d.lng == null)) return { ok: false, error: "An Experience Centre needs a map pin (latitude and longitude) for routing." };
    const data = { ...d, area: d.area || null };
    if (id) {
      const before = await prisma.branch.findUniqueOrThrow({ where: { id } });
      const after = await prisma.branch.update({ where: { id }, data });
      await audit(user.id, "master.branch_updated", "Branch", id, `Branch "${before.name}" updated${before.isActive !== after.isActive ? (after.isActive ? " (activated)" : " (deactivated — no longer used by routing)") : ""}`, before, after);
    } else {
      const created = await prisma.branch.create({ data });
      await audit(user.id, "master.branch_created", "Branch", created.id, `Branch "${created.name}" added — routing uses it from now on`, null, created);
      id = created.id;
    }
    refresh();
    return { ok: true, message: "Branch saved — routing uses it immediately", id };
  } catch (e) {
    return fail(e);
  }
}
