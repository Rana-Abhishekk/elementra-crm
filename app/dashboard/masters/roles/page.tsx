import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { userWithRoleInclude, toCurrentUser } from "@/lib/auth/current-user";
import { leadWhere, userWhere, visibleBranchIds } from "@/lib/auth/scope";
import { PageHeader } from "@/components/ui";
import { RolesEditor } from "./roles-editor";

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const actor = await requirePagePermission("roles.manage");
  const sp = await searchParams;
  const [roles, people] = await Promise.all([
    prisma.role.findMany({ orderBy: [{ isLocked: "desc" }, { isSystem: "desc" }, { name: "asc" }], include: { _count: { select: { users: { where: { isActive: true } } } } } }),
    prisma.user.findMany({ where: { AND: [userWhere(actor), { isActive: true }] }, select: { id: true, name: true, role: { select: { name: true } } }, orderBy: { name: "asc" } }),
  ]);

  // "Preview as…": what the chosen person can see and do, computed with the same scope rules as everywhere else
  let preview = null;
  if (sp.preview && people.some((p) => p.id === sp.preview)) {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: sp.preview }, include: userWithRoleInclude });
    const cu = toCurrentUser(u);
    const ids = visibleBranchIds(cu);
    const [leads, openLeads, users, branches] = await Promise.all([
      prisma.lead.count({ where: leadWhere(cu) }),
      prisma.lead.count({ where: { AND: [leadWhere(cu), { stage: { category: "OPEN" } }] } }),
      prisma.user.count({ where: { AND: [userWhere(cu), { isActive: true }] } }),
      prisma.branch.findMany({ where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) }, select: { name: true }, orderBy: { name: "asc" } }),
    ]);
    preview = { userId: u.id, name: u.name, roleName: cu.roleName, scope: cu.scope, leads, openLeads, users, branches: branches.map((b) => b.name.replace(" Experience Centre", "")), permissions: cu.permissions };
  }

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="A role = which records someone sees (Own / Branch / All) + what they can do (the checkboxes). One role per person. Changes apply on everyone's next click — no sign-out needed."
      />
      <RolesEditor
        roles={roles.map((r) => ({ id: r.id, name: r.name, description: r.description, scope: r.scope, permissions: r.permissions, isSystem: r.isSystem, isLocked: r.isLocked, users: r._count.users }))}
        actorPermissions={actor.permissions}
        actorScope={actor.scope}
        people={people.map((p) => ({ id: p.id, name: `${p.name} · ${p.role.name}` }))}
        preview={preview}
      />
    </div>
  );
}
