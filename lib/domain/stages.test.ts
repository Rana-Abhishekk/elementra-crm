import { describe, expect, it } from "vitest";
import { canTransition, parseLegacyStatus, stageLabel } from "./stages";

describe("stages", () => {
  it("allows moving forward, one step back, and to won/lost", () => {
    expect(canTransition("NEW", "QUOTATION_SENT")).toBe(true);
    expect(canTransition("QUALIFIED", "CONTACTED")).toBe(true);
    expect(canTransition("QUALIFIED", "NEW")).toBe(false);
    expect(canTransition("NEGOTIATION", "CLOSED_LOST")).toBe(true);
  });

  it("only reopens closed leads for managers", () => {
    expect(canTransition("CLOSED_LOST", "QUALIFIED")).toBe(false);
    expect(canTransition("CLOSED_LOST", "QUALIFIED", true)).toBe(true);
    expect(canTransition("CLOSED_WON", "CLOSED_LOST", true)).toBe(false);
  });

  it("labels lost leads with the reason in the client's wording", () => {
    expect(stageLabel("CLOSED_LOST", "NO_RESPONSE")).toBe("Closed Lost – No response");
    expect(stageLabel("DISCOVERY_MEETING")).toBe("4. Discovery / Requirement Meeting");
  });

  it("parses legacy sheet statuses regardless of spacing", () => {
    expect(parseLegacyStatus("14. Closed Lost - Others")).toEqual({ stage: "CLOSED_LOST", lostReason: "OTHERS" });
    expect(parseLegacyStatus("14.Closed Lost - Others")).toEqual({ stage: "CLOSED_LOST", lostReason: "OTHERS" });
    expect(parseLegacyStatus("12.Closed Lost - No response")).toEqual({ stage: "CLOSED_LOST", lostReason: "NO_RESPONSE" });
    expect(parseLegacyStatus("3. Lead Qualified")).toEqual({ stage: "QUALIFIED" });
  });
});
