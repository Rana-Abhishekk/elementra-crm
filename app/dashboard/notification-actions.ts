"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationsRead(ids?: string[]) {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
}
