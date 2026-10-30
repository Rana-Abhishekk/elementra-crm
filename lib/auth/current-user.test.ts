import { beforeEach, describe, expect, it, vi } from "vitest";

// The JWT holds only the user id; everything else is read per request. These tests prove a role change
// or a deactivation applies on the next request without signing in again.
const db = { user: null as null | Record<string, unknown> };
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn(async () => db.user) } } }));
vi.mock("./options", () => ({ getSessionUserId: vi.fn(async () => "arjun") }));

import { loadCurrentUser } from "./current-user";
import { can } from "./guards";

const row = (permissions: string[], isActive = true) => ({
  id: "arjun",
  name: "Arjun Nair",
  email: "arjun@elementra.test",
  isActive,
  branchId: "AND",
  receivesLeads: true,
  mustChangePassword: false,
  role: { id: "role_sales_executive", name: "Sales Executive", scope: "OWN", permissions, isLocked: false },
  extraBranches: [],
});

describe("per-request user loading", () => {
  beforeEach(() => {
    db.user = row(["leads.create", "leads.edit", "leads.export", "pipeline.move"]);
  });

  it("a permission removed from the role disappears on the next request", async () => {
    expect(can(await loadCurrentUser("arjun"), "leads.export")).toBe(true);
    db.user = row(["leads.create", "leads.edit", "pipeline.move"]);
    expect(can(await loadCurrentUser("arjun"), "leads.export")).toBe(false);
  });

  it("a deactivated user is rejected on the next request", async () => {
    expect(await loadCurrentUser("arjun")).not.toBeNull();
    db.user = row(["leads.edit"], false);
    expect(await loadCurrentUser("arjun")).toBeNull();
  });

  it("ignores permission keys that no longer exist in the catalogue", async () => {
    db.user = row(["leads.edit", "old.permission"]);
    expect((await loadCurrentUser("arjun"))!.permissions).toEqual(["leads.edit"]);
  });
});
