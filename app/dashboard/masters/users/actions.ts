"use server";

// User admin (06 §5.4–5.6). Server-side guards: you only manage people inside your scope, only hand out
// roles that can't see or do more than you, can't change your own role/status, and the last Super Admin stays.
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, type CurrentUser } from "@/lib/auth";
import { canSeeUser } from "@/lib/auth/scope";
import { userChangeError } from "@/lib/auth/escalation";
import { writeAudit } from "@/lib/domain/audit";
import { notify } from "@/lib/domain/notify";
import { pickAssignee } from "@/lib/domain/routing/assign";
import { shortBranch } from "@/lib/domain/routing/decide";
import { loadMembers } from "@/lib/domain/leads/context";
import { recomputeNextFollowUp } from "@/lib/domain/leads/workflow";

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: `That ${String(e.meta?.target ?? "value").includes("email") ? "email" : "employee code"} is already used.` };
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
};
const refresh = () => revalidatePath("/dashboard", "layout");

const activeSuperAdmins = () => prisma.user.count({ where: { isActive: true, role: { isLocked: true } } });
const loadTarget = (id: string) => prisma.user.findUnique({ where: { id }, include: { role: true, extraBranches: { select: { id: true } } } });
const tempPassword = () => `Temp-${randomInt(1000, 9999)}-${"ABCDEFGHJKMNPQRSTUVWXYZ"[randomInt(0, 23)]}${randomInt(10, 99)}`;
const PASSWORD = z.string().min(8, "At least 8 characters, with a letter and a number.").regex(/[A-Za-z]/, "Add a letter.").regex(/\d/, "Add a number.");

async function guard(actor: CurrentUser, target: Awaited<ReturnType<typeof loadTarget>>, next: { roleId: string; branchId: string | null; extraBranchIds: string[]; isActive: boolean }) {
  const role = await prisma.role.findUnique({ where: { id: next.roleId } });
  if (!role) throw new Error("Pick a role.");
  const err = userChangeError(actor, {
    target: target ? { id: target.id, branchId: target.branchId, roleId: target.roleId, isActive: target.isActive, isSuperAdmin: target.role.isLocked } : null,
    next: { branchId: next.branchId, extraBranchIds: next.extraBranchIds, role, isActive: next.isActive },
    activeSuperAdmins: await activeSuperAdmins(),
  });
  if (err) throw new Error(err);
  return role;
}

const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Email looks wrong"),
  phone: z.string().trim().max(20).nullish(),
  employeeCode: z.string().trim().max(20).nullish(),
  designation: z.string().trim().max(60).nullish(),
  roleId: z.string().min(1, "Pick a role"),
  branchId: z.string().nullish(),
  extraBranchIds: z.array(z.string()).max(20),
  reportsToId: z.string().nullish(),
  receivesLeads: z.boolean(),
  password: z.string().optional(),
});

export async function saveUserAction(id: string | null, input: z.input<typeof userSchema>): Promise<Result> {
  try {
    const actor = await requirePermission("users.manage");
    const d = userSchema.parse(input);
    const target = id ? await loadTarget(id) : null;
    if (id && !target) return { ok: false, error: "User not found." };
    const branchId = d.branchId || null;
    const extraBranchIds = d.extraBranchIds.filter((b) => b && b !== branchId);
    const role = await guard(actor, target, { roleId: d.roleId, branchId, extraBranchIds, isActive: target?.isActive ?? true });
    if (d.reportsToId) {
      const boss = await prisma.user.findUnique({ where: { id: d.reportsToId }, select: { id: true, branchId: true } });
      if (!boss || !canSeeUser(actor, boss) || boss.id === id) return { ok: false, error: "Pick a line manager you can see." };
    }
    const base = {
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      employeeCode: d.employeeCode || null,
      designation: d.designation || null,
      roleId: role.id,
      branchId,
      reportsToId: d.reportsToId || null,
      receivesLeads: d.receivesLeads,
    };
    if (target) {
      const after = await prisma.user.update({ where: { id: target.id }, data: { ...base, extraBranches: { set: extraBranchIds.map((b) => ({ id: b })) } }, include: { role: { select: { name: true } } } });
      const changes = [
        target.roleId !== role.id && `role ${target.role.name} → ${role.name}`,
        target.branchId !== branchId && "home branch",
        target.extraBranches.map((b) => b.id).sort().join() !== [...extraBranchIds].sort().join() && "extra branches",
        target.receivesLeads !== d.receivesLeads && (d.receivesLeads ? "receives leads" : "stops receiving leads"),
      ].filter(Boolean);
      await writeAudit({
        actorId: actor.id,
        action: target.roleId !== role.id ? "user.role_changed" : "user.updated",
        entityType: "User",
        entityId: target.id,
        summary: `${after.name} updated${changes.length ? `: ${changes.join(", ")}` : ""}`,
        diff: { before: { role: target.role.name, branchId: target.branchId, extraBranchIds: target.extraBranches.map((b) => b.id), receivesLeads: target.receivesLeads }, after: { role: role.name, branchId, extraBranchIds, receivesLeads: d.receivesLeads } },
      });
      refresh();
      return { ok: true, message: `${after.name} saved${target.roleId !== role.id ? " — the new role applies on their next click, no sign-in needed" : ""}`, id: target.id };
    }
    const password = d.password?.trim() || tempPassword();
    PASSWORD.parse(password);
    const created = await prisma.user.create({
      data: { ...base, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true, extraBranches: { connect: extraBranchIds.map((b) => ({ id: b })) } },
    });
    await writeAudit({ actorId: actor.id, action: "user.created", entityType: "User", entityId: created.id, summary: `${created.name} added as ${role.name}`, diff: { after: { email: created.email, role: role.name, branchId } } });
    refresh();
    return { ok: true, message: `${created.name} created. Temporary password: ${password} (they choose their own at first sign-in)`, id: created.id };
  } catch (e) {
    return fail(e);
  }
}

export async function setTempPasswordAction(id: string, password?: string): Promise<Result> {
  try {
    const actor = await requirePermission("users.manage");
    const target = await loadTarget(id);
    if (!target || !canSeeUser(actor, target)) return { ok: false, error: "User not found." };
    if (target.id === actor.id) return { ok: false, error: "Change your own password from My account." };
    if (target.role.isLocked && !actor.isSuperAdmin) return { ok: false, error: "Only a Super Admin can reset a Super Admin's password." };
    const pw = password?.trim() || tempPassword();
    PASSWORD.parse(pw);
    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(pw, 10), mustChangePassword: true } });
    await writeAudit({ actorId: actor.id, action: "user.password_reset", entityType: "User", entityId: id, summary: `Temporary password set for ${target.name}` });
    return { ok: true, message: `Temporary password for ${target.name}: ${pw}` };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Deactivate with hand-over (06 §5.6): open leads and tasks go to one person or are auto-distributed in
 * each lead's branch; then the user is switched off. Their session is rejected on the next request.
 */
export async function deactivateUserAction(id: string, input: { mode: "user" | "auto"; toUserId?: string | null }): Promise<Result> {
  try {
    const actor = await requirePermission("users.manage");
    const target = await loadTarget(id);
    if (!target || !canSeeUser(actor, target)) return { ok: false, error: "User not found." };
    await guard(actor, target, { roleId: target.roleId, branchId: target.branchId, extraBranchIds: target.extraBranches.map((b) => b.id), isActive: false });
    let toUser: { id: string; name: string } | null = null;
    if (input.mode === "user") {
      const u = input.toUserId ? await prisma.user.findUnique({ where: { id: input.toUserId }, select: { id: true, name: true, branchId: true, isActive: true } }) : null;
      if (!u || !u.isActive || u.id === target.id || !canSeeUser(actor, u)) return { ok: false, error: "Pick an active person to take over." };
      toUser = u;
    }
    const now = new Date();
    const leads = await prisma.lead.findMany({ where: { ownerId: target.id, stage: { category: "OPEN" } }, include: { branch: true } });
    const moves: { leadId: string; refCode: string; to: { id: string; name: string } | null }[] = [];
    for (const lead of leads) {
      let to = toUser;
      if (!to && lead.branch) {
        const members = (await loadMembers(lead.branch.id)).filter((m) => m.id !== target.id);
        const pick = pickAssignee(shortBranch(lead.branch.name), lead.branch.assignmentStrategy, members, now);
        to = pick.userId ? { id: pick.userId, name: pick.name! } : null;
      }
      moves.push({ leadId: lead.id, refCode: lead.refCode, to });
    }
    await prisma.$transaction(
      async (tx) => {
        for (const m of moves) {
          await tx.lead.update({ where: { id: m.leadId }, data: { ownerId: m.to?.id ?? null, assignedAt: now } });
          await tx.task.updateMany({ where: { leadId: m.leadId, assigneeId: target.id, status: { in: ["OPEN", "SNOOZED"] } }, data: m.to ? { assigneeId: m.to.id } : { status: "CANCELLED" } });
          await tx.activity.create({
            data: { leadId: m.leadId, type: "ASSIGNMENT", body: m.to ? `Reassigned from ${target.name} (deactivated) to ${m.to.name} by ${actor.name}.` : `${target.name} was deactivated; nobody in the branch was available, so the lead is unassigned.`, userId: actor.id, meta: { userId: m.to?.id ?? null }, createdAt: now },
          });
        }
        // Tasks without a lead (or on leads someone else owns) follow the chosen person, else close
        await tx.task.updateMany({ where: { assigneeId: target.id, status: { in: ["OPEN", "SNOOZED"] } }, data: toUser ? { assigneeId: toUser.id } : { status: "CANCELLED" } });
        await tx.user.update({ where: { id: target.id }, data: { isActive: false, deactivatedAt: now, receivesLeads: false, onLeave: false } });
      },
      { timeout: 30_000 },
    );
    for (const m of moves) await recomputeNextFollowUp(m.leadId);
    const byPerson = new Map<string, number>();
    for (const m of moves) if (m.to) byPerson.set(m.to.id, (byPerson.get(m.to.id) ?? 0) + 1);
    await notify([...byPerson.entries()].map(([uid, n]) => ({ userId: uid, type: "LEAD_ASSIGNED", title: `${n} lead${n > 1 ? "s" : ""} from ${target.name} reassigned to you`, href: "/dashboard/leads?view=my", dedupeKey: `DEACT:${target.id}:${uid}:${now.getTime()}` })));
    const unassigned = moves.filter((m) => !m.to).length;
    await writeAudit({
      actorId: actor.id,
      action: "user.deactivated",
      entityType: "User",
      entityId: target.id,
      summary: `${target.name} deactivated; ${moves.length} open lead(s) ${toUser ? `moved to ${toUser.name}` : "auto-distributed"}${unassigned ? ` (${unassigned} left unassigned)` : ""}`,
      diff: { leads: moves.map((m) => ({ ref: m.refCode, to: m.to?.name ?? null })) },
    });
    refresh();
    return { ok: true, message: `${target.name} deactivated · ${moves.length} lead(s) reassigned${unassigned ? `, ${unassigned} unassigned` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

export async function reactivateUserAction(id: string): Promise<Result> {
  try {
    const actor = await requirePermission("users.manage");
    const target = await loadTarget(id);
    if (!target || !canSeeUser(actor, target)) return { ok: false, error: "User not found." };
    await guard(actor, target, { roleId: target.roleId, branchId: target.branchId, extraBranchIds: target.extraBranches.map((b) => b.id), isActive: true });
    await prisma.user.update({ where: { id }, data: { isActive: true, deactivatedAt: null } });
    await writeAudit({ actorId: actor.id, action: "user.reactivated", entityType: "User", entityId: id, summary: `${target.name} reactivated` });
    refresh();
    return { ok: true, message: `${target.name} can sign in again (switch "receives leads" back on if needed)` };
  } catch (e) {
    return fail(e);
  }
}
