"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/domain/audit";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const PASSWORD_RULE = "At least 8 characters, with a letter and a number.";
const strong = z.string().min(8, PASSWORD_RULE).regex(/[A-Za-z]/, PASSWORD_RULE).regex(/\d/, PASSWORD_RULE);

export async function changeOwnPasswordAction(input: { current?: string; next: string; confirm: string }): Promise<Result> {
  try {
    const me = await requireUser();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    // A temporary password was already proven by signing in with it
    if (!user.mustChangePassword && !(await bcrypt.compare(input.current ?? "", user.passwordHash))) return { ok: false, error: "Your current password is wrong." };
    const next = strong.safeParse(input.next);
    if (!next.success) return { ok: false, error: next.error.issues[0].message };
    if (input.next !== input.confirm) return { ok: false, error: "The two new passwords don't match." };
    if (await bcrypt.compare(input.next, user.passwordHash)) return { ok: false, error: "Pick a password different from the current one." };
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(input.next, 10), mustChangePassword: false } });
    await writeAudit({ actorId: me.id, action: "user.password_changed", entityType: "User", entityId: me.id, summary: `${me.name} changed their password` });
    return { ok: true, message: "Password changed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
