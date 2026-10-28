import { describe, expect, it } from "vitest";
import { formatINR, formatLakh } from "./money";

describe("money", () => {
  it("uses Indian grouping", () => {
    expect(formatINR(850000)).toBe("₹8,50,000");
  });
  it("compacts to lakh / crore", () => {
    expect(formatLakh(850000)).toBe("₹8.5 L");
    expect(formatLakh(4800000)).toBe("₹48 L");
    expect(formatLakh(12000000)).toBe("₹1.2 Cr");
    expect(formatLakh(45000)).toBe("₹45,000");
    expect(formatLakh(null)).toBe("—");
  });
});
