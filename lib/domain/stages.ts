// Pipeline stages come from the database (Pipelines & Statuses master). This module only holds pure
// helpers that work on CATEGORY, sortOrder and flags — never on labels (06 §2).
import type { StageCategory } from "@prisma/client";

export interface StageRef {
  id: string;
  pipelineId: string;
  label: string;
  category: StageCategory;
  sortOrder: number;
  color: string;
  isInitial: boolean;
  isActive: boolean;
  requiresQualification: boolean;
  askReviveDate: boolean;
  requiresNote: boolean;
  staleDays: number | null;
  staleTaskType: string | null;
  probability: number | null;
  systemKey: string | null;
}

export const isOpen = (s: Pick<StageRef, "category">) => s.category === "OPEN";
export const isWon = (s: Pick<StageRef, "category">) => s.category === "WON";
export const isLost = (s: Pick<StageRef, "category">) => s.category === "LOST";

export const CATEGORY_LABEL: Record<StageCategory, string> = { OPEN: "Open", WON: "Won", LOST: "Lost" };

const bySort = (a: StageRef, b: StageRef) => a.sortOrder - b.sortOrder;

/** Active stages of one pipeline, in order. */
export function pipelineStages(stages: StageRef[], pipelineId: string, opts: { includeInactive?: boolean } = {}) {
  return stages.filter((s) => s.pipelineId === pipelineId && (opts.includeInactive || s.isActive)).sort(bySort);
}

export const openStages = (stages: StageRef[], pipelineId: string) => pipelineStages(stages, pipelineId).filter(isOpen);
export const wonStages = (stages: StageRef[], pipelineId: string) => pipelineStages(stages, pipelineId).filter(isWon);
export const lostStages = (stages: StageRef[], pipelineId: string) => pipelineStages(stages, pipelineId).filter(isLost);

export function initialStage(stages: StageRef[], pipelineId: string): StageRef | null {
  const list = pipelineStages(stages, pipelineId);
  return list.find((s) => s.isInitial) ?? list.find(isOpen) ?? null;
}

/** Optional automations hook onto a stage's stable systemKey; missing or inactive → null (no-op). */
export function stageByKey(stages: StageRef[], pipelineId: string, key: string): StageRef | null {
  return pipelineStages(stages, pipelineId).find((s) => s.systemKey === key) ?? null;
}

/** First stage behind the qualification gate (via-pre-sales handover, "Mark qualified"). */
export const firstQualifiedStage = (stages: StageRef[], pipelineId: string) => openStages(stages, pipelineId).find((s) => s.requiresQualification) ?? null;

/** Where an out-of-area lead goes when it's closed: the LOST stage keyed LOST_OTHERS, else the last LOST stage. */
export function outOfAreaLostStage(stages: StageRef[], pipelineId: string): StageRef | null {
  const lost = lostStages(stages, pipelineId);
  return lost.find((s) => s.systemKey === "LOST_OTHERS") ?? lost[lost.length - 1] ?? null;
}

/** "3. Lead Qualified" → "Lead Qualified" (kanban headers, chips). */
export const shortLabel = (label: string) => label.replace(/^\s*\d+[a-z]?\.\s*/i, "");

/**
 * Allowed moves: an open stage → any later open stage, one step back, or any Won/Lost stage.
 * Won/Lost → open only with `pipeline.reopen`. Moves never cross pipelines (use moveToPipeline).
 */
export function canTransition(stages: StageRef[], from: StageRef, to: StageRef, canReopen = false): boolean {
  if (from.id === to.id || from.pipelineId !== to.pipelineId || !to.isActive) return false;
  if (isOpen(from)) {
    if (!isOpen(to)) return true;
    const open = openStages(stages, from.pipelineId);
    const fi = open.findIndex((s) => s.id === from.id);
    const ti = open.findIndex((s) => s.id === to.id);
    if (fi < 0) return true; // the current stage was deactivated: any open stage is fine
    return ti > fi || ti === fi - 1;
  }
  return canReopen && isOpen(to);
}

/** Stage in another pipeline for a lead being moved: same category, nearest position. */
export function mapStageToPipeline(stages: StageRef[], from: StageRef, targetPipelineId: string): StageRef | null {
  const target = pipelineStages(stages, targetPipelineId).filter((s) => s.category === from.category);
  if (!target.length) return initialStage(stages, targetPipelineId);
  const source = pipelineStages(stages, from.pipelineId).filter((s) => s.category === from.category);
  const rel = source.length > 1 ? source.findIndex((s) => s.id === from.id) / (source.length - 1) : 0;
  return target[Math.round(Math.max(0, rel) * (target.length - 1))];
}

const normalise = (label: string) => shortLabel(label).toLowerCase().replace(/[\s.\-–—_]/g, "");

/** Legacy sheet value "14.Closed Lost - Others" → the stage whose label matches after the number. */
export function matchLegacyStatus(stages: StageRef[], pipelineId: string, raw: string): StageRef | null {
  const key = normalise(raw);
  if (!key) return null;
  const list = pipelineStages(stages, pipelineId, { includeInactive: true });
  return list.find((s) => normalise(s.label) === key) ?? list.find((s) => normalise(s.label).startsWith(key)) ?? null;
}

/** Server-side validation of a pipeline's stage list (06 §4.2). Returns human-readable problems. */
export function validatePipelineStages(stages: Pick<StageRef, "id" | "label" | "category" | "isActive" | "isInitial">[]): string[] {
  const errors: string[] = [];
  const active = stages.filter((s) => s.isActive);
  const initial = active.filter((s) => s.isInitial);
  if (initial.length !== 1) errors.push(initial.length ? "Only one stage can be the starting stage." : "Pick one active starting stage for new leads.");
  if (initial[0] && initial[0].category !== "OPEN") errors.push("The starting stage must be an Open stage.");
  if (!active.some(isOpen)) errors.push("Keep at least one active Open stage.");
  if (!active.some(isWon)) errors.push("Keep at least one active Won stage.");
  if (!active.some(isLost)) errors.push("Keep at least one active Lost stage.");
  const seen = new Set<string>();
  for (const s of stages) {
    const k = s.label.trim().toLowerCase();
    if (!k) errors.push("Stage headings can't be empty.");
    else if (seen.has(k)) errors.push(`"${s.label.trim()}" is used twice.`);
    seen.add(k);
  }
  return errors;
}

export interface PipelineRef {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  autoProductIds: string[];
}

/** First active pipeline whose auto-products intersect the lead's products; otherwise the default. */
export function pickPipeline(pipelines: PipelineRef[], productIds: string[]): PipelineRef | null {
  const active = pipelines.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const auto = active.find((p) => p.autoProductIds.some((id) => productIds.includes(id)));
  return auto ?? active.find((p) => p.isDefault) ?? active[0] ?? null;
}

/** The DB allows one open lead per phone: the key is set while the lead is open. */
export const openPhoneKey = (category: StageCategory, phoneE164: string | null | undefined) => (category === "OPEN" && phoneE164 ? phoneE164 : null);

/** Inline badge colours from a stage/source hex colour. */
export function chipStyle(hex: string, inactive = false): Record<string, string> {
  const c = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#64748B";
  // --tw-ring-color drives the Chip's ring-1 outline
  return inactive ? { backgroundColor: "#F1F5F9", color: "#94A3B8", "--tw-ring-color": "#E2E8F0" } : { backgroundColor: `${c}14`, color: c, "--tw-ring-color": `${c}40` };
}
