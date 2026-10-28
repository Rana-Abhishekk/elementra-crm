import { describe, expect, it } from "vitest";
import { canEditLead, canSeeLead, leadWhereForUser } from "./access";

const lead = (o: Partial<Parameters<typeof canSeeLead>[1]> = {}) => ({
  ownerId: "rep1",
  branchId: "AND",
  locationStatus: "RESOLVED" as const,
  handedOverById: null,
  ...o,
});
const user = (role: "OWNER" | "SALES_MANAGER" | "PRESALES" | "SALES_REP", id = "u", branchId: string | null = null) => ({ id, role, branchId });

describe("lead access", () => {
  it("reps see only their own leads", () => {
    expect(canSeeLead(user("SALES_REP", "rep1"), lead())).toBe(true);
    expect(canSeeLead(user("SALES_REP", "rep2"), lead())).toBe(false);
    expect(leadWhereForUser(user("SALES_REP", "rep1"))).toEqual({ ownerId: "rep1" });
  });

  it("managers see their branch and the out-of-area queue", () => {
    const m = user("SALES_MANAGER", "m", "AND");
    expect(canSeeLead(m, lead())).toBe(true);
    expect(canSeeLead(m, lead({ branchId: "WOR" }))).toBe(false);
    expect(canSeeLead(m, lead({ branchId: null, ownerId: null, locationStatus: "OUT_OF_AREA" }))).toBe(true);
  });

  it("pre-sales keep read-only access after handover", () => {
    const p = user("PRESALES", "p");
    const handed = lead({ handedOverById: "p" });
    expect(canSeeLead(p, handed)).toBe(true);
    expect(canEditLead(p, handed)).toBe(false);
    expect(canEditLead(p, lead({ ownerId: "p", locationStatus: "NEEDS_LOCATION" }))).toBe(true);
  });

  it("owners see everything", () => {
    expect(leadWhereForUser(user("OWNER"))).toEqual({});
  });
});
