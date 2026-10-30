import { describe, expect, it } from "vitest";
import { conversionPct, monthKeys, monthlyRunRate, pctChange, reachedCounts, weeklyGroups } from "./dashboard-trends";

const now = new Date("2026-10-30T06:30:00Z"); // 30 Oct, 12:00 IST

describe("pctChange", () => {
  it("rounds the change", () => expect(pctChange(114, 100)).toBe(14));
  it("handles a fall", () => expect(pctChange(50, 100)).toBe(-50));
  it("has no comparison against zero", () => expect(pctChange(5, 0)).toBeNull());
});

describe("conversionPct", () => {
  it("is n/a below 5 closed leads", () => expect(conversionPct(3, 1)).toBeNull());
  it("is won ÷ closed", () => expect(conversionPct(1, 4)).toBe(20));
});

describe("reachedCounts", () => {
  it("counts each stage plus everything after it", () => expect(reachedCounts([18, 8, 25, 0])).toEqual([51, 33, 25, 0]));
  it("never widens", () => {
    const r = reachedCounts([1, 9, 2, 7]);
    expect(r).toEqual([...r].sort((a, b) => b - a));
  });
});

describe("monthlyRunRate", () => {
  it("averages over the window", () => expect(monthlyRunRate(300_000)).toBe(100_000));
});

describe("weeklyGroups", () => {
  const at = (d: Date) => d;
  it("puts today in the last bucket and drops older items", () => {
    const old = new Date("2026-01-01T00:00:00Z");
    const groups = weeklyGroups([now, old], at, now, 8);
    expect(groups).toHaveLength(8);
    expect(groups[7].items).toEqual([now]);
    expect(groups.flatMap((g) => g.items)).toEqual([now]);
  });
  it("buckets by IST day boundaries", () => {
    // 18:29 UTC on the 23rd is 23:59 IST on the 23rd: the last moment of the first of two buckets
    const edge = new Date("2026-10-23T18:29:00Z");
    expect(weeklyGroups([edge], at, now, 2)[0].items).toEqual([edge]);
  });
});

describe("monthKeys", () => {
  it("runs across a year end", () => {
    expect(monthKeys(new Date("2026-12-10T00:00:00Z"), 1, 1).map((m) => m.key)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
  it("uses the IST month at a UTC boundary", () => {
    expect(monthKeys(new Date("2026-10-31T19:00:00Z"), 0).map((m) => m.key)).toEqual(["2026-11"]);
  });
});
