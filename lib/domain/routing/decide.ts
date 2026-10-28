// decideBranch(): resolved location → branch + rule + explanation (spec §8.3). Pure.
import type { RoutingRule } from "@prisma/client";
import { GEO_METHOD_LABEL } from "@/lib/domain/labels";
import { haversineKm, round1 } from "@/lib/domain/geo/haversine";
import type { ResolvedLocation } from "@/lib/domain/geo/resolve";

export interface BranchForRouting {
  id: string;
  code: string;
  name: string;
  kind: "EXPERIENCE_CENTRE" | "ONLINE_DESK";
  lat: number | null;
  lng: number | null;
  serviceRadiusKm: number;
  isActive: boolean;
}

export interface PincodeRuleForRouting {
  pincode: string;
  branchId: string;
}

export interface Candidate {
  branchId: string;
  code: string;
  name: string;
  distanceKm: number;
  radiusKm: number;
  inRadius: boolean;
}

export interface BranchDecision {
  rule: RoutingRule;
  branchId: string | null;
  /** In VIA_PRESALES mode: the branch the lead will be handed over to */
  suggestedBranchId: string | null;
  distanceKm: number | null;
  candidates: Candidate[];
  explanation: string[];
  justOutside: boolean;
}

// Out-of-area leads within this many km beyond the radius are labelled "Just outside radius" (Decision D12)
export const JUST_OUTSIDE_KM = 10;

export const shortBranch = (name: string) => name.replace(/ Experience Centre$/, "");
const km = (n: number) => `${n.toFixed(1)} km`;

export function describeLocation(loc: ResolvedLocation): string {
  if (loc.kind === "NONE") return loc.note ? `No usable site location (${loc.note}).` : "No site location given.";
  if (loc.kind === "REGION") return `${loc.note}.`;
  const pct = loc.confidence != null ? `${Math.round(loc.confidence * 100)}%` : "";
  switch (loc.method) {
    case "PINCODE":
      return `Pincode ${loc.matchedText} → ${loc.label}.`;
    case "FUZZY":
      return `Read "${loc.matchedText}" as ${loc.label} (${GEO_METHOD_LABEL.FUZZY.toLowerCase()}, ${pct}).`;
    case "ALIAS":
      return `Matched "${loc.matchedText}" → ${loc.label}${loc.note ? ` — ${loc.note}` : ""}.`;
    default:
      return `Location: ${loc.label} (${GEO_METHOD_LABEL[loc.method]}).`;
  }
}

export function decideBranch(
  loc: ResolvedLocation,
  branches: BranchForRouting[],
  pincodeRules: PincodeRuleForRouting[],
  mode: "DIRECT" | "VIA_PRESALES" = "DIRECT",
): BranchDecision {
  const onlineDesk = branches.find((b) => b.kind === "ONLINE_DESK" && b.isActive) ?? null;
  const centres = branches.filter((b) => b.kind === "EXPERIENCE_CENTRE" && b.isActive && b.lat != null && b.lng != null);
  const explanation = [describeLocation(loc)];
  const base = { suggestedBranchId: null, distanceKm: null, candidates: [] as Candidate[], justOutside: false };

  if (loc.kind === "NONE" || loc.lat == null || loc.lng == null) {
    if (loc.kind === "REGION") {
      explanation.push("Outside the service area → parked in the Out-of-area queue for a manager.");
      return { ...base, rule: "OUT_OF_AREA", branchId: null, explanation };
    }
    explanation.push("→ Online Desk will call the customer to confirm the site area.");
    return { ...base, rule: "NEEDS_LOCATION", branchId: onlineDesk?.id ?? null, explanation };
  }

  const point = { lat: loc.lat, lng: loc.lng };
  const candidates: Candidate[] = centres
    .map((b) => {
      const distanceKm = round1(haversineKm(point, { lat: b.lat!, lng: b.lng! }));
      return { branchId: b.id, code: b.code, name: shortBranch(b.name), distanceKm, radiusKm: b.serviceRadiusKm, inRadius: distanceKm <= b.serviceRadiusKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const nearest = candidates[0];
  const place = loc.locality?.name ?? "The site";

  const finish = (rule: RoutingRule, chosen: Candidate | null, justOutside = false): BranchDecision => {
    if (chosen && mode === "VIA_PRESALES" && (rule === "PINCODE_RULE" || rule === "NEAREST_IN_RADIUS")) {
      explanation.push(`Routing mode is "via Online Desk": the Online Desk qualifies first, then hands over to ${chosen.name}.`);
      return { rule: "VIA_PRESALES", branchId: onlineDesk?.id ?? null, suggestedBranchId: chosen.branchId, distanceKm: chosen.distanceKm, candidates, explanation, justOutside };
    }
    return { rule, branchId: chosen?.branchId ?? null, suggestedBranchId: null, distanceKm: chosen?.distanceKm ?? nearest?.distanceKm ?? null, candidates, explanation, justOutside };
  };

  // Pincode rule: typed pincode first, then the matched locality's pincode
  const pins = [loc.typedPincode, loc.locality?.pincode].filter((p): p is string => !!p);
  for (const pin of pins) {
    const rule = pincodeRules.find((r) => r.pincode === pin);
    const ruled = rule && candidates.find((c) => c.branchId === rule.branchId);
    if (!ruled) continue;
    const nearer = candidates.find((c) => c.distanceKm < ruled.distanceKm);
    explanation.push(
      nearer
        ? `Pincode ${pin} is mapped to ${ruled.name} by rule (${nearer.name} is ${(ruled.distanceKm - nearer.distanceKm).toFixed(1)} km nearer by distance — the rule wins).`
        : `Pincode ${pin} is mapped to ${ruled.name} by rule (${km(ruled.distanceKm)} away).`,
    );
    return finish("PINCODE_RULE", ruled);
  }

  const inRadius = candidates.filter((c) => c.inRadius);
  if (inRadius.length) {
    const chosen = inRadius[0];
    const next = candidates.find((c) => c.branchId !== chosen.branchId);
    explanation.push(
      `${place} is ${km(chosen.distanceKm)} from the ${chosen.name} Experience Centre (radius ${chosen.radiusKm} km)` +
        (next ? `; next nearest ${next.name} ${km(next.distanceKm)}.` : "."),
    );
    return finish("NEAREST_IN_RADIUS", chosen);
  }

  const justOutside = !!nearest && nearest.distanceKm <= nearest.radiusKm + JUST_OUTSIDE_KM;
  explanation.push(
    nearest
      ? `${place} is ${km(nearest.distanceKm)} from the nearest branch, ${nearest.name} (radius ${nearest.radiusKm} km)${justOutside ? " — just outside the radius" : ""}.`
      : "No active Experience Centre has coordinates.",
  );
  explanation.push("Outside the service area → parked in the Out-of-area queue for a manager.");
  return finish("OUT_OF_AREA", null, justOutside);
}
