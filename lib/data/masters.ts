// Masters loaded from the DB. Pages call getMasters() (memoised per request); scripts and domain code
// running outside React call loadMasters() directly.
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { initialStage, pipelineStages, type PipelineRef, type StageRef } from "@/lib/domain/stages";
import type { ProductRef, SourceRef } from "@/lib/domain/masters/resolve";

type Db = Prisma.TransactionClient | typeof prisma;

export interface Masters {
  pipelines: (PipelineRef & { description: string | null })[];
  stages: StageRef[];
  sources: SourceRef[];
  products: ProductRef[];
  stageById: Map<string, StageRef>;
  sourceById: Map<string, SourceRef>;
  productById: Map<string, ProductRef>;
  pipelineById: Map<string, PipelineRef & { description: string | null }>;
  defaultPipeline: PipelineRef;
}

export async function loadMasters(db: Db = prisma): Promise<Masters> {
  const [pipelines, stages, sources, products] = await Promise.all([
    db.pipeline.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { autoProducts: { select: { id: true } } } }),
    db.pipelineStage.findMany({ orderBy: [{ pipelineId: "asc" }, { sortOrder: "asc" }] }),
    db.source.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const pls = pipelines.map(({ autoProducts, ...p }) => ({ ...p, autoProductIds: autoProducts.map((a) => a.id) }));
  const defaultPipeline = pls.find((p) => p.isDefault && p.isActive) ?? pls.find((p) => p.isActive) ?? pls[0];
  if (!defaultPipeline) throw new Error("No pipeline configured — run `npm run db:seed`.");
  return {
    pipelines: pls,
    stages,
    sources,
    products,
    stageById: new Map(stages.map((s) => [s.id, s])),
    sourceById: new Map(sources.map((s) => [s.id, s])),
    productById: new Map(products.map((p) => [p.id, p])),
    pipelineById: new Map(pls.map((p) => [p.id, p])),
    defaultPipeline,
  };
}

export const getMasters = cache(() => loadMasters());

/** Ids of every OPEN stage (all pipelines) — for "open leads" queries. */
export const openStageIds = (m: Pick<Masters, "stages">) => m.stages.filter((s) => s.category === "OPEN").map((s) => s.id);
export const stageIdsOf = (m: Pick<Masters, "stages">, category: "OPEN" | "WON" | "LOST") => m.stages.filter((s) => s.category === category).map((s) => s.id);

export function initialStageOf(m: Masters, pipelineId: string): StageRef {
  const s = initialStage(m.stages, pipelineId);
  if (!s) throw new Error("This pipeline has no active starting stage.");
  return s;
}

export const activeStagesOf = (m: Masters, pipelineId: string) => pipelineStages(m.stages, pipelineId);

/** Prisma where-fragments by category (relation filter, works across pipelines). */
export const stageCategoryWhere = (category: "OPEN" | "WON" | "LOST"): Prisma.LeadWhereInput => ({ stage: { category } });
export const openLeadWhere: Prisma.LeadWhereInput = { stage: { category: "OPEN" } };
