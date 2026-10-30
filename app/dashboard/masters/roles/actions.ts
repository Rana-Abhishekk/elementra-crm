"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DataScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { isPermission } from "@/lib/auth/permissions";
import { roleEditError } from "@/lib/auth/escalation";
import { writeAudit } from "@/lib/domain/audit";

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "A role with that name already exists." };
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
};

const roleSchema = z.object({
  name: z.string().trim().min(2, "Name the role").max(60),
  description: z.string().trim().max(200).nullish(),
  scope: z.enum(DataScope),
  permissions: z.array(z.string()).max(100),
});

export async function saveRoleAction(id: string | null, input: z.input<typeof roleSchema>): Promise<Result> {
  try {
    const actor = await requirePermission("roles.manage");
    const d = roleSchema.parse(input);
    const permissions = [...new Set(d.permissions.filter(isPermission))];
    const before = id ? await prisma.role.findUnique({ where: { id } }) : null;
    if (id && !before) return { ok: false, error: "Role not found." };
    const err = roleEditError(actor, before, { scope: d.scope, permissions });
    if (err) return { ok: false, error: err };
    if (before?.isLocked && before.name !== d.name) return { ok: false, error: `${before.name} can't be renamed.` };
    const data = { name: d.name, description: d.description || null, scope: d.scope, permissions };
    const role = before ? await prisma.role.update({ where: { id: before.id }, data }) : await prisma.role.create({ data });
    const added = permissions.filter((p) => !before?.permissions.includes(p));
    const removed = (before?.permissions ?? []).filter((p) => !(permissions as string[]).includes(p));
    await writeAudit({
      actorId: actor.id,
      action: before ? "role.updated" : "role.created",
      entityType: "Role",
      entityId: role.id,
      summary: before
        ? `Role "${role.name}" updated${before.scope !== role.scope ? `, scope ${before.scope} → ${role.scope}` : ""}${added.length ? `, + ${added.join(", ")}` : ""}${removed.length ? `, − ${removed.join(", ")}` : ""}`
        : `Role "${role.name}" created (${role.scope}, ${permissions.length} permissions)`,
      diff: { before: before ? { scope: before.scope, permissions: before.permissions } : null, after: { scope: role.scope, permissions } },
    });
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: before ? "Role saved — everyone with it gets the change on their next click" : "Role created", id: role.id };
  } catch (e) {
    return fail(e);
  }
}

export async function cloneRoleAction(id: string): Promise<Result> {
  try {
    const actor = await requirePermission("roles.manage");
    const src = await prisma.role.findUniqueOrThrow({ where: { id } });
    const err = roleEditError(actor, null, { scope: src.scope, permissions: src.permissions });
    if (err) return { ok: false, error: err };
    let name = `${src.name} (copy)`;
    for (let n = 2; await prisma.role.findUnique({ where: { name } }); n++) name = `${src.name} (copy ${n})`;
    const role = await prisma.role.create({ data: { name, description: src.description, scope: src.scope, permissions: src.permissions } });
    await writeAudit({ actorId: actor.id, action: "role.created", entityType: "Role", entityId: role.id, summary: `Role "${name}" cloned from "${src.name}"` });
    revalidatePath("/dashboard/masters/roles");
    return { ok: true, message: `Created "${name}" — rename it and adjust the checkboxes`, id: role.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRoleAction(id: string): Promise<Result> {
  try {
    const actor = await requirePermission("roles.manage");
    const role = await prisma.role.findUniqueOrThrow({ where: { id }, include: { _count: { select: { users: true } } } });
    if (role.isSystem) return { ok: false, error: `"${role.name}" is a built-in role and can't be deleted.` };
    if (role._count.users) return { ok: false, error: `${role._count.users} user(s) have this role. Give them another role first.` };
    await prisma.role.delete({ where: { id } });
    await writeAudit({ actorId: actor.id, action: "role.deleted", entityType: "Role", entityId: id, summary: `Role "${role.name}" deleted`, diff: { before: { scope: role.scope, permissions: role.permissions } } });
    revalidatePath("/dashboard/masters/roles");
    return { ok: true, message: "Role deleted" };
  } catch (e) {
    return fail(e);
  }
}
