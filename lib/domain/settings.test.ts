import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings";

describe("mergeSettings", () => {
  it("returns defaults with no rows", () => {
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("overrides only the stored keys and ignores invalid sections", () => {
    const s = mergeSettings([
      { key: "sla", value: { firstContactMins: 2 } },
      { key: "geo", value: { fuzzyThreshold: "high" } },
      { key: "unknown", value: 1 },
    ]);
    expect(s.sla).toEqual({ firstContactMins: 2, escalateMins: 240 });
    expect(s.geo).toEqual(DEFAULT_SETTINGS.geo);
  });
});
