import { prisma } from "@/lib/prisma";
import { can, requirePagePermission } from "@/lib/auth";
import { userWhere, visibleBranchIds } from "@/lib/auth/scope";
import { roleAssignError } from "@/lib/auth/escalation";
import { PageHeader } from "@/components/ui";
import { UsersMaster } from "./users-master";

type SP = Promise<{ branch?: string; role?: string; status?: string; q?: string }>;

export default async function UsersMasterPage({ searchParams }: { searchParams: SP }) {
  const actor = await requirePagePermission("users.view", "users.manage");
  const sp = await searchParams;
  const branchIds = visibleBranchIds(actor);
  const status = sp.status ?? "active";
  const [users, roles, branches, openLeads, openTasks] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          userWhere(actor),
          sp.branch ? { OR: [{ branchId: sp.branch }, { extraBranches: { some: { id: sp.branch } } }] } : {},
          sp.role ? { roleId: sp.role } : {},
          status === "all" ? {} : { isActive: status === "active" },
          sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { employeeCode: { contains: sp.q, mode: "insensitive" } }] } : {},
        ],
      },
      include: { role: { select: { id: true, name: true, isLocked: true } }, branch: { select: { id: true, name: true } }, extraBranches: { select: { id: true, name: true } }, reportsTo: { select: { id: true, name: true } } },
      orderBy: [{ isActive: "desc" }, { branch: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    prisma.branch.findMany({ where: { isActive: true, ...(branchIds ? { id: { in: branchIds } } : {}) }, orderBy: [{ kind: "desc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.lead.groupBy({ by: ["ownerId"], where: { stage: { category: "OPEN" }, ownerId: { not: null } }, _count: true }),
    prisma.task.groupBy({ by: ["assigneeId"], where: { status: { in: ["OPEN", "SNOOZED"] } }, _count: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          actor.scope === "ALL"
            ? "Everyone with a login. Each person has one role (what they can do and see), a home branch (where leads are assigned) and optional extra branches."
            : "People in your branches. You can add executives and change their details within your own branches."
        }
      />
      <UsersMaster
        canManage={can(actor, "users.manage")}
        actorId={actor.id}
        filters={{ branch: sp.branch ?? "", role: sp.role ?? "", status, q: sp.q ?? "" }}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          employeeCode: u.employeeCode,
          designation: u.designation,
          roleId: u.role.id,
          roleName: u.role.name,
          isSuperAdmin: u.role.isLocked,
          branchId: u.branch?.id ?? null,
          branchName: u.branch?.name ?? null,
          extraBranches: u.extraBranches,
          reportsTo: u.reportsTo,
          receivesLeads: u.receivesLeads,
          onLeave: u.onLeave,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          mustChangePassword: u.mustChangePassword,
          openLeads: openLeads.find((x) => x.ownerId === u.id)?._count ?? 0,
          openTasks: openTasks.find((x) => x.assigneeId === u.id)?._count ?? 0,
        }))}
        roles={roles.map((r) => ({ id: r.id, name: r.name, users: r._count.users, assignable: !roleAssignError(actor, r), reason: roleAssignError(actor, r) }))}
        branches={branches}
      />
    </div>
  );
}
