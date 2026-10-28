import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export interface NotificationInput {
  userId: string;
  type: string; // "LEAD_ASSIGNED" | "SLA_BREACH" | "FOLLOW_UP_DUE" | …
  title: string;
  body?: string | null;
  leadId?: string | null;
  href?: string | null;
  dedupeKey?: string | null;
}

/** Creates notifications; rows whose dedupeKey already exists are skipped. Returns how many were created. */
export async function notify(items: NotificationInput | NotificationInput[], db: Db = prisma): Promise<number> {
  const data = (Array.isArray(items) ? items : [items]).filter((n) => n.userId);
  if (!data.length) return 0;
  const res = await db.notification.createMany({ data, skipDuplicates: true });
  return res.count;
}

export async function ownerIds(db: Db = prisma): Promise<string[]> {
  const owners = await db.user.findMany({ where: { role: "OWNER", isActive: true }, select: { id: true } });
  if (owners.length) return owners.map((o) => o.id);
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  return admins.map((a) => a.id);
}
