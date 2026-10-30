// The one place that answers "may this user do X?" (06 §2.3). Server actions and route handlers call
// requirePermission(); pages call requirePagePermission(); components use can() to hide buttons.
import { notFound, redirect } from "next/navigation";
import type { CurrentUser } from "./current-user";
import { requireUser } from "./current-user";
import type { Permission } from "./permissions";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
  }
}

export const isDemoMode = () => process.env.DEMO_MODE === "true";

export const can = (user: Pick<CurrentUser, "permissions"> | null | undefined, perm: Permission) => !!user && user.permissions.includes(perm);
export const canAny = (user: Pick<CurrentUser, "permissions"> | null | undefined, perms: Permission[]) => perms.some((p) => can(user, p));

/** Signed in and holding at least one of `perms` (none = signed in only); otherwise throws. */
export async function requirePermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (perms.length && !canAny(user, perms)) throw new ForbiddenError();
  return user;
}

/** Pages: without the permission you go back to the dashboard instead of an error screen. */
export async function requirePagePermission(...perms: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (perms.length && !canAny(user, perms)) redirect("/dashboard?denied=1");
  return user;
}

/** Out-of-scope records answer 404, so their existence isn't revealed (06 §5.3). */
export function assertFound<T>(value: T | null | undefined): T {
  if (!value) notFound();
  return value;
}
