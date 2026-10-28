import { describe, expect, it } from "vitest";
import { formatPhone, normalisePhone, parsePhones, splitPhones, waLink } from "./phone";

describe("normalisePhone", () => {
  it.each([
    ["9000012345", "+919000012345"],
    ["919000012345", "+919000012345"],
    ["+91 90000 12345", "+919000012345"],
    ["p:+919000012345", "+919000012345"],
    ["09000012345", "+919000012345"],
    ["+91-90000-12345", "+919000012345"],
  ])("%s → %s", (raw, e164) => {
    expect(normalisePhone(raw)).toEqual({ e164, isInternational: false });
  });

  it("keeps international numbers as-is and flags them", () => {
    expect(normalisePhone("(+1)5550142233")).toEqual({ e164: "+15550142233", isInternational: true });
    expect(normalisePhone("+44 20 7946 0000")).toEqual({ e164: "+442079460000", isInternational: true });
  });

  it("rejects junk", () => {
    expect(normalisePhone("NA")).toBeNull();
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });
});

describe("parsePhones", () => {
  it("splits two numbers in one cell into primary and alternate", () => {
    const { primary, alt } = parsePhones("9000012345,\n9000067890");
    expect(primary?.e164).toBe("+919000012345");
    expect(alt?.e164).toBe("+919000067890");
  });

  it("splits on slash and 'or'", () => {
    expect(splitPhones("9000012345 / 9000067890")).toHaveLength(2);
    expect(splitPhones("9000012345 or 9000067890")).toHaveLength(2);
  });
});

describe("display helpers", () => {
  it("formats Indian numbers and builds wa.me links", () => {
    expect(formatPhone("+919000012345")).toBe("+91 90000 12345");
    expect(waLink("+919000012345", "Hi")).toBe("https://wa.me/919000012345?text=Hi");
  });
});
