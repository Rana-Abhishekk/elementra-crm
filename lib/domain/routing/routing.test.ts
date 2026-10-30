import { describe, expect, it } from "vitest";
import { BRANCHES, LOCALITIES, PINCODE_RULES } from "@/lib/domain/geo/gazetteer";
import { resolveLocation } from "@/lib/domain/geo/resolve";
import { decideBranch, type BranchForRouting } from "./decide";
import { isOnLeave, pickAssignee, type Member } from "./assign";

const branches: BranchForRouting[] = BRANCHES.map((b) => ({ ...b, id: b.code, isActive: true }));
const rules = PINCODE_RULES.map((r) => ({ pincode: r.pincode, branchId: r.branchCode }));
const route = (siteAddress?: string, pincode?: string, mode: "DIRECT" | "VIA_PRESALES" = "DIRECT") =>
  decideBranch(resolveLocation({ siteAddress, pincode }, LOCALITIES), branches, rules, mode);
const dist = (d: ReturnType<typeof route>, code: string) => d.candidates.find((c) => c.code === code)?.distanceKm;

describe("decideBranch — demo scenarios (02_REFERENCE_DATA §8)", () => {
  it("1. Worli pincode → Worli 0.0 km, nearest in radius", () => {
    const d = route("Flat 1802, Worli Sea Face", "400018");
    expect(d).toMatchObject({ rule: "NEAREST_IN_RADIUS", branchId: "WOR", distanceKm: 0 });
  });

  it("2. misspelt Goregaon → Andheri 4.4 km (Worli 17.0)", () => {
    const d = route("Flat 704, Palm Residency, goregoan east");
    expect(d).toMatchObject({ rule: "NEAREST_IN_RADIUS", branchId: "AND", distanceKm: 4.4 });
    expect(dist(d, "WOR")).toBe(17);
    expect(d.explanation[0]).toContain("Goregaon East");
  });

  it("3. Vashi pincode rule beats distance (Andheri 18.9 < Worli 20.3)", () => {
    const d = route("Sector 17, Vashi 400703");
    expect(d).toMatchObject({ rule: "PINCODE_RULE", branchId: "WOR", distanceKm: 20.3 });
    expect(dist(d, "AND")).toBe(18.9);
    expect(d.explanation.join(" ")).toMatch(/Andheri is 1\.4 km nearer.*rule wins/);
  });

  it("rule also applies via the matched locality's pincode (no pincode typed)", () => {
    expect(route("Kharghar sector 20")).toMatchObject({ rule: "PINCODE_RULE", branchId: "WOR" });
  });

  it("4. Baner → Pune 10.5 km", () => {
    expect(route("Baner, Pune")).toMatchObject({ rule: "NEAREST_IN_RADIUS", branchId: "PUN", distanceKm: 10.5 });
  });

  it("5. Surat → out of area, nearest Andheri 226.1 km", () => {
    const d = route("Adajan, Surat, Gujarat");
    expect(d).toMatchObject({ rule: "OUT_OF_AREA", branchId: null, justOutside: false });
    expect(d.candidates[0]).toMatchObject({ code: "AND", distanceKm: 226.1 });
  });

  it("6. Panvel → out of area, just outside Worli's 30 km radius", () => {
    const d = route("New Panvel 410206");
    expect(d).toMatchObject({ rule: "OUT_OF_AREA", branchId: null, justOutside: true, distanceKm: 31.8 });
    expect(d.explanation.join(" ")).toMatch(/31\.8 km from the nearest branch, Worli \(radius 30 km\)/);
  });

  it("7. no location → Online Desk", () => {
    expect(route(undefined)).toMatchObject({ rule: "NEEDS_LOCATION", branchId: "ONL" });
    expect(route("NA")).toMatchObject({ rule: "NEEDS_LOCATION", branchId: "ONL" });
    expect(route("Mumbai")).toMatchObject({ rule: "NEEDS_LOCATION" });
  });

  it("9. Powai → Andheri 8.3 km", () => {
    expect(route("Powai, Hiranandani")).toMatchObject({ branchId: "AND", distanceKm: 8.3 });
  });

  it("10. Lokhandwala → Andheri", () => {
    expect(route("Andheri West, Lokhandwala")).toMatchObject({ branchId: "AND", distanceKm: 0 });
  });

  it("playground: Kandiwali east → Andheri 8.7; Kalyan West → out of area 34.3 from Andheri", () => {
    expect(route("kandiwali east")).toMatchObject({ branchId: "AND", distanceKm: 8.7 });
    const k = route("Kalyan West");
    expect(k).toMatchObject({ rule: "OUT_OF_AREA", distanceKm: 34.3 });
    expect(k.candidates[0].code).toBe("AND");
  });

  it("region keyword → out of area without distance", () => {
    expect(route("Jaipur, Rajasthan")).toMatchObject({ rule: "OUT_OF_AREA", candidates: [] });
  });

  it("via pre-sales mode parks routable leads at the Online Desk with a suggestion", () => {
    expect(route("Baner, Pune", undefined, "VIA_PRESALES")).toMatchObject({ rule: "VIA_PRESALES", branchId: "ONL", suggestedBranchId: "PUN" });
  });
});

const NOW = new Date("2026-10-28T08:00:00Z");
const m = (id: string, o: Partial<Member> = {}): Member => ({
  id,
  name: id,
  isManager: false,
  isActive: true,
  receivesLeads: true,
  onLeave: false,
  onLeaveUntil: null,
  lastAssignedAt: null,
  openLeads: 0,
  ...o,
});
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000);

describe("pickAssignee", () => {
  it("round-robin picks the oldest lastAssignedAt, never-assigned first", () => {
    const members = [m("Arjun Nair", { lastAssignedAt: ago(1) }), m("Meera Joshi", { lastAssignedAt: ago(5) }), m("New Rep")];
    expect(pickAssignee("Andheri", "ROUND_ROBIN", members, NOW).name).toBe("New Rep");
    expect(pickAssignee("Andheri", "ROUND_ROBIN", members.slice(0, 2), NOW).name).toBe("Meera Joshi");
  });

  it("round-robin cycles through members in order", () => {
    const members = [m("A"), m("B"), m("C")];
    const order: string[] = [];
    let t = 0;
    for (let i = 0; i < 6; i++) {
      const pick = pickAssignee("X", "ROUND_ROBIN", members, NOW);
      order.push(pick.name!);
      members.find((x) => x.id === pick.userId)!.lastAssignedAt = new Date(NOW.getTime() + ++t * 1000);
    }
    expect(order).toEqual(["A", "B", "C", "A", "B", "C"]);
  });

  it("skips people on leave and lists them", () => {
    const pick = pickAssignee("Andheri", "ROUND_ROBIN", [m("u1", { name: "Arjun Nair", onLeave: true }), m("u2", { name: "Meera Joshi", lastAssignedAt: ago(0.1) })], NOW);
    expect(pick.name).toBe("Meera Joshi");
    expect(pick.skipped).toEqual([{ userId: "u1", name: "Arjun Nair", reason: "on leave" }]);
    expect(pick.explanation.join(" ")).toContain("Skipped: Arjun Nair (on leave)");
  });

  it("leave with an end date in the past no longer counts", () => {
    expect(isOnLeave({ onLeave: true, onLeaveUntil: ago(1) }, NOW)).toBe(false);
    expect(isOnLeave({ onLeave: true, onLeaveUntil: new Date(NOW.getTime() + 3600_000) }, NOW)).toBe(true);
  });

  it("ignores members who don't receive leads", () => {
    const pick = pickAssignee("Andheri", "ROUND_ROBIN", [m("mgr", { isManager: true, receivesLeads: false }), m("rep")], NOW);
    expect(pick.userId).toBe("rep");
  });

  it("least open leads, tie-broken by round-robin", () => {
    const members = [m("Tanvi", { openLeads: 9 }), m("Dev", { openLeads: 4, lastAssignedAt: ago(1) }), m("Zed", { openLeads: 4, lastAssignedAt: ago(3) })];
    const pick = pickAssignee("Tardeo", "LEAST_OPEN_LEADS", members, NOW);
    expect(pick.name).toBe("Zed");
    expect(pick.explanation[0]).toMatch(/Fewest open leads/);
  });

  it("falls back to the branch manager, else unassigned", () => {
    const mgr = m("Farah", { isManager: true, receivesLeads: false });
    expect(pickAssignee("Andheri", "ROUND_ROBIN", [mgr, m("Arjun", { onLeave: true })], NOW)).toMatchObject({ userId: "Farah", fallback: "MANAGER" });
    expect(pickAssignee("Andheri", "ROUND_ROBIN", [m("Arjun", { onLeave: true })], NOW)).toMatchObject({ userId: null, fallback: "UNASSIGNED" });
  });
});
