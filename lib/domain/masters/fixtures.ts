// Test fixtures: the seeded masters as in-memory refs (no DB). Used by unit tests only.
import type { StageRef, PipelineRef } from "@/lib/domain/stages";
import { PIPELINES, PRODUCTS } from "./defaults";

export const FIXTURE_STAGES: StageRef[] = PIPELINES.flatMap((p) =>
  p.stages.map((s, i) => ({
    id: s.id ?? `${p.id}_${s.systemKey.toLowerCase()}`,
    pipelineId: p.id,
    label: s.label,
    category: s.category,
    sortOrder: i + 1,
    color: s.color,
    isInitial: !!s.isInitial,
    isActive: true,
    requiresQualification: !!s.requiresQualification,
    askReviveDate: !!s.askReviveDate,
    requiresNote: false,
    staleDays: s.staleDays ?? null,
    staleTaskType: s.staleTaskType ?? (s.staleDays ? "FOLLOW_UP" : null),
    probability: s.probability ?? null,
    systemKey: s.systemKey,
  })),
);

export const FIXTURE_PIPELINES: PipelineRef[] = PIPELINES.map((p, i) => ({
  id: p.id,
  name: p.name,
  isDefault: p.isDefault,
  isActive: true,
  sortOrder: i,
  autoProductIds: p.autoProducts.map((name) => PRODUCTS.find((x) => x.name === name)!.id),
}));

/** Stage of the default sales pipeline (or another pipeline) by systemKey. */
export function fixtureStage(key: string, pipelineId = "pl_sales"): StageRef {
  const s = FIXTURE_STAGES.find((x) => x.pipelineId === pipelineId && x.systemKey === key);
  if (!s) throw new Error(`No fixture stage ${pipelineId}/${key}`);
  return s;
}
