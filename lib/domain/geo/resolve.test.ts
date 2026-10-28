import { describe, expect, it } from "vitest";
import { LOCALITIES } from "./gazetteer";
import { jaroWinkler } from "./jaroWinkler";
import { cleanText, coreText, isEmptyLocation } from "./normalise";
import { resolveLocation } from "./resolve";

const r = (siteAddress: string, pincode?: string) => resolveLocation({ siteAddress, pincode }, LOCALITIES);

describe("normalise", () => {
  it("expands sides and strips noise", () => {
    expect(cleanText("Flat 1203, Lodha, Borivalli (W)")).toBe("flat 1203 lodha borivalli west");
    expect(coreText("Andheri (E), Mumbai")).toBe("andheri east");
    expect(cleanText("King's Circle")).toBe("kings circle");
  });

  it("treats NA-like text as no location", () => {
    for (const s of ["NA", "na", "-", "n/a", "multiple projects", "", "  "]) expect(isEmptyLocation(s)).toBe(true);
    expect(isEmptyLocation("Worli")).toBe(false);
  });
});

describe("jaroWinkler", () => {
  it("scores the demo misspellings above the threshold", () => {
    expect(jaroWinkler("goregoan", "goregaon")).toBeGreaterThan(0.95);
    expect(jaroWinkler("borivalli", "borivali")).toBeGreaterThan(0.95);
    expect(jaroWinkler("kandiwali", "kandivali")).toBeGreaterThan(0.95);
  });
});

describe("resolveLocation", () => {
  it("pincode wins first", () => {
    const res = r("Flat 1802, Worli Sea Face", "400018");
    expect(res).toMatchObject({ method: "PINCODE", confidence: 1, label: "Worli, Mumbai 400018" });
    expect(r("Sector 17, Vashi 400703")).toMatchObject({ method: "PINCODE", typedPincode: "400703" });
    expect(r("New Panvel 410206").locality?.name).toBe("Panvel");
  });

  it("matches aliases and landmarks", () => {
    expect(r("Baner, Pune")).toMatchObject({ method: "ALIAS", confidence: 0.95 });
    expect(r("Baner, Pune").locality?.name).toBe("Baner");
    expect(r("Powai, Hiranandani").locality?.name).toBe("Powai");
    expect(r("Thakur Village").locality?.name).toBe("Kandivali East");
    expect(r("Adajan, Surat, Gujarat").locality?.name).toBe("Surat");
    expect(r("Thane - Ghodbunder").locality?.name).toBe("Ghodbunder Road");
    expect(r("Andheri West, Lokhandwala").locality?.name).toBe("Andheri West");
  });

  it("prefers the most specific locality over a city word", () => {
    expect(r("Kharghar, Navi Mumbai").locality?.name).toBe("Kharghar");
    expect(r("Navi mumbai vashi").locality?.name).toBe("Vashi");
  });

  it.each([
    ["Flat 704, Palm Residency, goregoan east", "Goregaon East"],
    ["Borivalli west", "Borivali West"],
    ["Flat 1203, Lodha, Borivalli (W)", "Borivali West"],
    ["kandiwali east", "Kandivali East"],
    ["Kandiwali east", "Kandivali East"],
    ["Ghatkoper west", "Ghatkopar West"],
  ])("fuzzy: %s → %s", (input, name) => {
    const res = r(input);
    expect(res.method).toBe("FUZZY");
    expect(res.locality?.name).toBe(name);
    expect(res.confidence).toBeGreaterThanOrEqual(0.88);
  });

  it("never confuses Andheri East and Andheri West", () => {
    expect(r("Andheri East").locality?.name).toBe("Andheri East");
    expect(r("Andheri West").locality?.name).toBe("Andheri West");
    expect(r("Andheri (E)").locality?.name).toBe("Andheri East");
    expect(r("Andheri (W)").locality?.name).toBe("Andheri West");
    expect(r("Marol, Andheri east").locality?.name).toBe("Andheri East");
    // misspelt base, typed side is applied exactly
    expect(r("Andheeri east").locality?.name).toBe("Andheri East");
    expect(r("Andheeri west").locality?.name).toBe("Andheri West");
  });

  it("uses the main area when no side is typed, with lower confidence", () => {
    const res = r("Andheri");
    expect(res.locality?.name).toBe("Andheri West");
    expect(res.confidence).toBeLessThanOrEqual(0.9);
  });

  it("short names only match exactly", () => {
    expect(r("Juhu").locality?.name).toBe("Juhu");
    expect(r("Sion east").locality?.name).toBe("Sion");
    expect(r("Jhuu").method).toBe("NONE");
  });

  it("falls back to city centroids and flags bare 'Mumbai'", () => {
    expect(r("Pune")).toMatchObject({ method: "ALIAS", confidence: 0.7 });
    expect(r("Pune").locality?.name).toBe("Ganj Peth");
    const mumbai = r("Mumbai");
    expect(mumbai.kind).toBe("NONE");
    expect(mumbai.note).toMatch(/City only/);
  });

  it("recognises out-of-area regions without coordinates", () => {
    const res = r("Somewhere in Rajasthan");
    expect(res).toMatchObject({ kind: "REGION", confidence: 0.6, label: "Rajasthan" });
  });

  it("returns NONE for NA / empty", () => {
    expect(r("NA").method).toBe("NONE");
    expect(resolveLocation({}, LOCALITIES).kind).toBe("NONE");
  });

  it("does not match society names to localities", () => {
    for (const soc of ["Sea View Heights", "Palm Residency", "Orchid Towers", "Lakeview Enclave", "Harbour Crest", "Sunrise Park", "Green Acres", "Skyline Residency", "Riverdale Apartments", "Silver Oak CHS"]) {
      expect(r(`Flat 101, ${soc}`).kind, soc).toBe("NONE");
    }
  });
});
