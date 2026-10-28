"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { loadMembers, loadRoutingContext } from "@/lib/domain/leads/context";
import { resolveLocation } from "@/lib/domain/geo/resolve";
import { decideBranch, shortBranch, type Candidate } from "@/lib/domain/routing/decide";
import { pickAssignee } from "@/lib/domain/routing/assign";
import { GEO_METHOD_LABEL, RULE_LABEL } from "@/lib/domain/labels";

export interface PlaygroundResult {
  input: string;
  label: string | null;
  method: string;
  confidence: number | null;
  lat: number | null;
  lng: number | null;
  rule: string;
  branch: string | null;
  nextRep: string | null;
  candidates: Candidate[];
  explanation: string[];
}

/** Routing playground: same functions as live intake, nothing is saved. */
export async function dryRunRouting(text: string): Promise<{ ok: true; result: PlaygroundResult } | { ok: false; error: string }> {
  await requireUser();
  const input = z.string().trim().min(1, "Type an address or pincode").max(300).safeParse(text);
  if (!input.success) return { ok: false, error: input.error.issues[0].message };
  const ctx = await loadRoutingContext();
  const pin = input.data.match(/\b[1-9]\d{5}\b/)?.[0] ?? null;
  const loc = resolveLocation({ siteAddress: input.data, pincode: pin }, ctx.localities, { fuzzyThreshold: ctx.settings.geo.fuzzyThreshold });
  const decision = decideBranch(loc, ctx.branches, ctx.rules, ctx.settings.routing.mode);
  const branch = ctx.branches.find((b) => b.id === (decision.suggestedBranchId ?? decision.branchId));
  let nextRep: string | null = null;
  const explanation = [...decision.explanation];
  if (branch) {
    const pick = pickAssignee(branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(branch.name), branch.assignmentStrategy, await loadMembers(branch.id), new Date());
    nextRep = pick.name;
    explanation.push(...pick.explanation);
  }
  return {
    ok: true,
    result: {
      input: input.data,
      label: loc.label,
      method: GEO_METHOD_LABEL[loc.method],
      confidence: loc.confidence,
      lat: loc.lat,
      lng: loc.lng,
      rule: RULE_LABEL[decision.rule],
      branch: branch ? (branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(branch.name)) : null,
      nextRep,
      candidates: decision.candidates,
      explanation,
    },
  };
}
