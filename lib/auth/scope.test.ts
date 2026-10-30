import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { ROLES } from "@/lib/domain/masters/defaults";
import { toCurrentUser, type CurrentUser } from "./current-user";
import { canEditLead, canSeeLead, canSeeUser, leadWhere, userWhere, type LeadAccessShape } from "./scope";
import { roleAssignError, roleEditError, userChangeError } from "./escalation";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const role = (name: string) => {
  const r = ROLES.find((x) => x.name === name)!;
  return { id: r.id, name: r.name, scope: r.scope, permissions: r.permissions as string[], isLocked: !!r.isLocked };
};
const person = (id: string, roleName: string, branchId: string | null, extra: string[] = []): CurrentUser =>
  toCurrentUser({ id, name: id, email: `${id}@elementra.test`, branchId, receivesLeads: true, mustChangePassword: false, role: role(roleName), extraBranches: extra.map((b) => ({ id: b })) });

const owner = person("aarav", "Super Admin", null);
const kabirWorli = person("kabir", "Branch Manager", "WOR");
const snehaPune = person("sneha", "Branch Manager", "PUN");
const vikram = person("vikram", "Branch Manager", "WOR", ["AND", "TAR"]);
const arjunAndheri = person("arjun", "Sales Executive", "AND");
const meeraAndheri = person("meera", "Sales Executive", "AND");
const ananyaDesk = person("ananya", "Online Desk", "ONL");
const viewer = person("viewer", "Management Viewer", null);

const lead = (o: Partial<LeadAccessShape> = {}): LeadAccessShape => ({ ownerId: "arjun", branchId: "AND", locationStatus: "RESOLVED", handedOverById: null, ...o });
const puneLead = lead({ ownerId: "omkar", branchId: "PUN" });
const worliLead = lead({ ownerId: "ishita", branchId: "WOR" });
const tardeoLead = lead({ ownerId: "dev", branchId: "TAR" });

/** Minimal evaluator for the where-shapes leadWhere/userWhere produce, to prove they agree with canSee*. */
function matches(where: Prisma.LeadWhereInput | Prisma.UserWhereInput, row: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as object[]).some((w) => matches(w, row));
    if (v && typeof v === "object" && "in" in v) return (v as { in: unknown[] }).in.includes(row[k]);
    return row[k] === v;
  });
}

describe("lead visibility (06 §5.3)", () => {
  it("Worli manager never sees Pune data", () => {
    expect(canSeeLead(kabirWorli, worliLead)).toBe(true);
    expect(canSeeLead(kabirWorli, puneLead)).toBe(false);
    expect(matches(leadWhere(kabirWorli), puneLead as never)).toBe(false);
    expect(canSeeLead(snehaPune, puneLead)).toBe(true);
    expect(canSeeLead(snehaPune, worliLead)).toBe(false);
  });

  it("an executive sees only their own leads, not a colleague's", () => {
    expect(canSeeLead(arjunAndheri, lead())).toBe(true);
    expect(canSeeLead(meeraAndheri, lead())).toBe(false);
    expect(matches(leadWhere(meeraAndheri), lead() as never)).toBe(false);
  });

  it("a regional manager sees exactly their three branches", () => {
    const seen = ["WOR", "AND", "TAR", "PUN", "ONL"].filter((b) => canSeeLead(vikram, lead({ ownerId: "x", branchId: b })));
    expect(seen).toEqual(["WOR", "AND", "TAR"]);
    expect(canSeeLead(vikram, tardeoLead)).toBe(true);
    expect(canSeeLead(vikram, puneLead)).toBe(false);
  });

  it("Super Admin and ALL-scope viewers see everything", () => {
    expect(leadWhere(owner)).toEqual({});
    expect(canSeeLead(owner, puneLead)).toBe(true);
    expect(canSeeLead(viewer, puneLead)).toBe(true);
    expect(canEditLead(viewer, puneLead)).toBe(false); // no leads.edit
  });

  it("queue permissions add unrouted leads; handed-over leads stay read-only", () => {
    const needs = lead({ ownerId: "sara", branchId: "ONL", locationStatus: "NEEDS_LOCATION" });
    expect(canSeeLead(ananyaDesk, needs)).toBe(true);
    expect(canEditLead(ananyaDesk, needs)).toBe(true);
    const handed = lead({ handedOverById: "ananya" });
    expect(canSeeLead(ananyaDesk, handed)).toBe(true);
    expect(canEditLead(ananyaDesk, handed)).toBe(false);
    const ooa = lead({ ownerId: null, branchId: null, locationStatus: "OUT_OF_AREA" });
    expect(canSeeLead(kabirWorli, ooa)).toBe(true); // queues.outOfArea
    expect(canSeeLead(arjunAndheri, ooa)).toBe(false);
  });

  it("leadWhere and canSeeLead agree for every user × lead", () => {
    const users = [owner, kabirWorli, snehaPune, vikram, arjunAndheri, meeraAndheri, ananyaDesk, viewer];
    const leads = [
      lead(),
      puneLead,
      worliLead,
      tardeoLead,
      lead({ ownerId: "kabir", branchId: "PUN" }),
      lead({ ownerId: "sara", branchId: "ONL", locationStatus: "NEEDS_LOCATION" }),
      lead({ ownerId: null, branchId: null, locationStatus: "OUT_OF_AREA" }),
      lead({ ownerId: "rohan", branchId: "WOR", handedOverById: "ananya" }),
    ];
    for (const u of users) for (const l of leads) expect(matches(leadWhere(u), l as never), `${u.id} × ${JSON.stringify(l)}`).toBe(canSeeLead(u, l));
  });
});

describe("user visibility", () => {
  it("managers see only people in their branches; executives only themselves", () => {
    const puneRep = { id: "omkar", branchId: "PUN" };
    const worliRep = { id: "ishita", branchId: "WOR" };
    expect(canSeeUser(kabirWorli, worliRep)).toBe(true);
    expect(canSeeUser(kabirWorli, puneRep)).toBe(false);
    expect(matches(userWhere(kabirWorli), puneRep)).toBe(false);
    expect(canSeeUser(vikram, { id: "dev", branchId: "TAR" })).toBe(true);
    expect(canSeeUser(arjunAndheri, { id: "meera", branchId: "AND" })).toBe(false);
    expect(userWhere(arjunAndheri)).toEqual({ id: "arjun" });
    expect(userWhere(owner)).toEqual({});
  });
});

describe("anti-escalation (06 §5.4)", () => {
  it("a role can only be handed out if it's within your own permissions and scope", () => {
    expect(roleAssignError(kabirWorli, role("Sales Executive"))).toBeNull();
    expect(roleAssignError(kabirWorli, role("Super Admin"))).toMatch(/Only a Super Admin/);
    expect(roleAssignError(kabirWorli, role("Management Viewer"))).toMatch(/sees more data/);
    expect(roleAssignError(kabirWorli, role("Online Desk"))).toMatch(/permissions you don't have/); // queues.needsLocation, imports.run
    expect(roleAssignError(owner, role("Super Admin"))).toBeNull();
  });

  it("role edits can't exceed your own rights; the locked Super Admin role is fixed", () => {
    const sa = role("Super Admin");
    expect(roleEditError(owner, sa, { scope: "BRANCH", permissions: sa.permissions })).toMatch(/can't be changed/);
    expect(roleEditError(owner, sa, { scope: "ALL", permissions: sa.permissions.slice(1) })).toMatch(/can't be changed/);
    expect(roleEditError(kabirWorli, null, { scope: "ALL", permissions: [] })).toMatch(/more data/);
    expect(roleEditError(kabirWorli, null, { scope: "OWN", permissions: ["settings.manage"] })).toMatch(/don't have/);
    expect(roleEditError(owner, role("Sales Executive"), { scope: "OWN", permissions: ["leads.create"] })).toBeNull();
  });

  const target = (u: CurrentUser) => ({ id: u.id, branchId: u.branchId, roleId: u.roleId, isActive: true, isSuperAdmin: u.isSuperAdmin });
  const next = (roleName: string, branchId: string | null, isActive = true, extraBranchIds: string[] = []) => ({ branchId, extraBranchIds, role: role(roleName), isActive });

  it("blocks self-edits of role and active status", () => {
    expect(userChangeError(kabirWorli, { target: target(kabirWorli), next: next("Super Admin", "WOR"), activeSuperAdmins: 2 })).toMatch(/your own role/);
    expect(userChangeError(kabirWorli, { target: target(kabirWorli), next: next("Branch Manager", "WOR", false), activeSuperAdmins: 2 })).toMatch(/deactivate yourself/);
  });

  it("branch managers can only manage people in their own branches", () => {
    const ishita = person("ishita", "Sales Executive", "WOR");
    expect(userChangeError(kabirWorli, { target: target(ishita), next: next("Sales Executive", "WOR"), activeSuperAdmins: 2 })).toBeNull();
    expect(userChangeError(kabirWorli, { target: target(ishita), next: next("Sales Executive", "PUN"), activeSuperAdmins: 2 })).toMatch(/own branches/);
    expect(userChangeError(kabirWorli, { target: target(person("omkar", "Sales Executive", "PUN")), next: next("Sales Executive", "PUN"), activeSuperAdmins: 2 })).toBe("User not found.");
    expect(userChangeError(kabirWorli, { target: null, next: next("Sales Executive", "WOR"), activeSuperAdmins: 2 })).toBeNull();
    expect(userChangeError(kabirWorli, { target: null, next: next("Super Admin", "WOR"), activeSuperAdmins: 2 })).toMatch(/Only a Super Admin/);
  });

  it("protects the last active Super Admin", () => {
    const admin2 = person("admin2", "Super Admin", null);
    expect(userChangeError(owner, { target: target(admin2), next: next("Super Admin", null, false), activeSuperAdmins: 1 })).toMatch(/last active Super Admin/);
    expect(userChangeError(owner, { target: target(admin2), next: next("Branch Manager", "WOR"), activeSuperAdmins: 1 })).toMatch(/last active Super Admin/);
    expect(userChangeError(owner, { target: target(admin2), next: next("Super Admin", null, false), activeSuperAdmins: 2 })).toBeNull();
  });
});
