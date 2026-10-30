import { describe, expect, it } from "vitest";
import {
  canTransition,
  firstQualifiedStage,
  initialStage,
  mapStageToPipeline,
  matchLegacyStatus,
  openPhoneKey,
  outOfAreaLostStage,
  pickPipeline,
  shortLabel,
  stageByKey,
  validatePipelineStages,
} from "./stages";
import { FIXTURE_PIPELINES, FIXTURE_STAGES, fixtureStage as st } from "./masters/fixtures";

const S = FIXTURE_STAGES;

describe("stage transitions (by position and category, never by label)", () => {
  it("allows moving forward, one step back, and to won/lost", () => {
    expect(canTransition(S, st("NEW"), st("QUOTATION_SENT"))).toBe(true);
    expect(canTransition(S, st("QUALIFIED"), st("CONTACTED"))).toBe(true);
    expect(canTransition(S, st("QUALIFIED"), st("NEW"))).toBe(false);
    expect(canTransition(S, st("NEGOTIATION"), st("LOST_BUDGET"))).toBe(true);
    expect(canTransition(S, st("NEGOTIATION"), st("CLOSED_WON"))).toBe(true);
  });

  it("only reopens closed leads with permission", () => {
    expect(canTransition(S, st("LOST_ON_HOLD"), st("QUALIFIED"))).toBe(false);
    expect(canTransition(S, st("LOST_ON_HOLD"), st("QUALIFIED"), true)).toBe(true);
    expect(canTransition(S, st("CLOSED_WON"), st("LOST_OTHERS"), true)).toBe(false);
  });

  it("follows the admin's order after a reorder, and never crosses pipelines", () => {
    const swapped = S.map((s) => (s.id === "stg_discovery" ? { ...s, sortOrder: 5 } : s.id === "stg_quote_requested" ? { ...s, sortOrder: 4 } : s));
    const byId = (id: string) => swapped.find((s) => s.id === id)!;
    // After the swap, "Discovery" is one step after "Quotation requested", so going back to it is allowed
    expect(canTransition(swapped, byId("stg_discovery"), byId("stg_quote_requested"))).toBe(true);
    expect(canTransition(swapped, byId("stg_quote_requested"), byId("stg_qualified"))).toBe(true);
    expect(canTransition(S, st("NEW"), st("SITE_VISIT", "pl_turnkey"))).toBe(false);
  });

  it("keeps a renamed stage working (labels don't matter)", () => {
    const renamed = S.map((s) => (s.systemKey === "QUALIFIED" && s.pipelineId === "pl_sales" ? { ...s, label: "3. Qualified – Ready for visit" } : s));
    const q = renamed.find((s) => s.id === "stg_qualified")!;
    expect(canTransition(renamed, st("CONTACTED"), q)).toBe(true);
    expect(firstQualifiedStage(renamed, "pl_sales")?.label).toBe("3. Qualified – Ready for visit");
  });

  it("can't move into an inactive stage", () => {
    const off = S.map((s) => (s.id === "stg_quote_sent" ? { ...s, isActive: false } : s));
    expect(canTransition(off, st("NEW"), off.find((s) => s.id === "stg_quote_sent")!)).toBe(false);
  });
});

describe("stage lookups", () => {
  it("finds the starting stage, hooks and the out-of-area close stage", () => {
    expect(initialStage(S, "pl_sales")?.label).toBe("1. New Lead / Inquiry");
    expect(initialStage(S, "pl_turnkey")?.label).toBe("New enquiry");
    expect(stageByKey(S, "pl_turnkey", "CONTACTED")).toBeNull();
    expect(outOfAreaLostStage(S, "pl_sales")?.label).toBe("14. Closed Lost – Others");
    expect(outOfAreaLostStage(S, "pl_turnkey")?.label).toBe("Lost – On hold");
    expect(shortLabel("3. Lead Qualified")).toBe("Lead Qualified");
    expect(shortLabel("6a. Revised Quotation Sent")).toBe("Revised Quotation Sent");
  });

  it("maps a stage to another pipeline by category and position", () => {
    expect(mapStageToPipeline(S, st("NEW"), "pl_turnkey")?.label).toBe("New enquiry");
    expect(mapStageToPipeline(S, st("TOKEN_RECEIVED"), "pl_turnkey")?.label).toBe("Advance received");
    expect(mapStageToPipeline(S, st("CLOSED_WON"), "pl_turnkey")?.label).toBe("Won");
  });

  it("parses legacy sheet statuses regardless of spacing", () => {
    expect(matchLegacyStatus(S, "pl_sales", "14. Closed Lost - Others")?.id).toBe("stg_lost_others");
    expect(matchLegacyStatus(S, "pl_sales", "14.Closed Lost - Others")?.id).toBe("stg_lost_others");
    expect(matchLegacyStatus(S, "pl_sales", "12.Closed Lost - No response")?.id).toBe("stg_lost_no_response");
    expect(matchLegacyStatus(S, "pl_sales", "3. Lead Qualified")?.id).toBe("stg_qualified");
    expect(matchLegacyStatus(S, "pl_sales", "Something else")).toBeNull();
  });
});

describe("pipeline master validation", () => {
  const base = S.filter((s) => s.pipelineId === "pl_sales");
  it("accepts the seeded pipeline", () => {
    expect(validatePipelineStages(base)).toEqual([]);
  });

  it("needs exactly one starting stage, a won and a lost stage, unique headings", () => {
    expect(validatePipelineStages(base.map((s) => ({ ...s, isInitial: false })))).toContain("Pick one active starting stage for new leads.");
    expect(validatePipelineStages(base.map((s) => ({ ...s, isInitial: s.category === "OPEN" })))).toContain("Only one stage can be the starting stage.");
    expect(validatePipelineStages(base.filter((s) => s.category !== "WON"))).toContain("Keep at least one active Won stage.");
    expect(validatePipelineStages(base.map((s) => (s.category === "LOST" ? { ...s, isActive: false } : s)))).toContain("Keep at least one active Lost stage.");
    expect(validatePipelineStages([...base, { ...base[1], id: "x" }])).toContain('"2. Contacted" is used twice.');
  });
});

describe("pipeline auto-selection", () => {
  it("picks the pipeline whose auto-products match, else the default", () => {
    expect(pickPipeline(FIXTURE_PIPELINES, ["prd_kitchen"])?.id).toBe("pl_sales");
    expect(pickPipeline(FIXTURE_PIPELINES, ["prd_kitchen", "prd_full_home"])?.id).toBe("pl_turnkey");
    expect(pickPipeline(FIXTURE_PIPELINES, [])?.id).toBe("pl_sales");
    expect(pickPipeline(FIXTURE_PIPELINES.map((p) => (p.id === "pl_turnkey" ? { ...p, isActive: false } : p)), ["prd_full_home"])?.id).toBe("pl_sales");
  });
});

describe("one open lead per phone", () => {
  it("keys open leads by phone and releases the key when closed", () => {
    expect(openPhoneKey("OPEN", "+919000000123")).toBe("+919000000123");
    expect(openPhoneKey("WON", "+919000000123")).toBeNull();
    expect(openPhoneKey("LOST", "+919000000123")).toBeNull();
    expect(openPhoneKey("OPEN", null)).toBeNull();
  });
});
