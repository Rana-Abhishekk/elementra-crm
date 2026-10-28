import { redirect } from "next/navigation";
import type { LocationStatus, Prisma, Role } from "@prisma/client";
import { requireUser, type SessionUser } from "@/lib/auth";

export const MANAGER_ROLES: Role[] = ["OWNER", "ADMIN", "SALES_MANAGER"];
export const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export const isAdmin = (u: Pick<SessionUser, "role">) => ADMIN_ROLES.includes(u.role);
export const isManager = (u: Pick<SessionUser, "role">) => MANAGER_ROLES.includes(u.role);

export class ForbiddenError extends Error {
  constructor(message = "You don't have access to this.") {
    super(message);
  }
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** For pages: send users without the role back to their start page instead of throwing. */
export async function requirePageRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}

export const isDemoMode = () => process.env.DEMO_MODE === "true";

/** The only filter list and detail queries use (spec §12). */
export function leadWhereForUser(user: SessionUser): Prisma.LeadWhereInput {
  switch (user.role) {
    case "OWNER":
    case "ADMIN":
      return {};
    case "SALES_MANAGER":
      return {
        OR: [
          { ownerId: user.id },
          { locationStatus: "OUT_OF_AREA" },
          ...(user.branchId ? [{ branchId: user.branchId }] : []),
        ],
      };
    case "PRESALES":
      return { OR: [{ ownerId: user.id }, { locationStatus: "NEEDS_LOCATION" }, { handedOverById: user.id }] };
    case "SALES_REP":
    default:
      return { ownerId: user.id };
  }
}

type LeadAccessShape = {
  ownerId: string | null;
  branchId: string | null;
  locationStatus: LocationStatus;
  handedOverById: string | null;
};

export function canSeeLead(user: SessionUser, lead: LeadAccessShape): boolean {
  switch (user.role) {
    case "OWNER":
    case "ADMIN":
      return true;
    case "SALES_MANAGER":
      return lead.ownerId === user.id || lead.locationStatus === "OUT_OF_AREA" || (!!user.branchId && lead.branchId === user.branchId);
    case "PRESALES":
      return lead.ownerId === user.id || lead.locationStatus === "NEEDS_LOCATION" || lead.handedOverById === user.id;
    default:
      return lead.ownerId === user.id;
  }
}

/** Pre-sales keep read-only access to leads after they hand them over. */
export function canEditLead(user: SessionUser, lead: LeadAccessShape): boolean {
  if (user.role === "PRESALES") return lead.ownerId === user.id || lead.locationStatus === "NEEDS_LOCATION";
  return canSeeLead(user, lead);
}

export function canReassign(user: SessionUser) {
  return isManager(user);
}
