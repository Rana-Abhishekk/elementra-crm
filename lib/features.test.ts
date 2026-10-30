import { describe, expect, it } from "vitest";
import { FEATURES } from "./features";
import { NAV_GROUPS } from "./nav";

describe("feature registry", () => {
  it("lists F1–F57 exactly once", () => {
    const ids = FEATURES.map((f) => f.id).sort();
    expect(ids).toEqual(Array.from({ length: 57 }, (_, i) => `F${i + 1}`).sort());
  });

  it("nav badges point at registered features", () => {
    for (const item of NAV_GROUPS.flatMap((g) => g.items)) {
      if (item.feature) expect(FEATURES.some((f) => f.id === item.feature)).toBe(true);
    }
  });
});
