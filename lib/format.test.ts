import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats paise as rupees with Indian grouping", () => {
    expect(formatMoney(85_000_000)).toBe("₹8,50,000");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("₹0");
  });
});
