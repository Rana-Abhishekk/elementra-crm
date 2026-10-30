import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { superAdminIds } from "@/lib/auth/scope";

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

/** Business owners (Super Admin role) get queue alerts and owner copies. */
export async function ownerIds(db: Db = prisma): Promise<string[]> {
  return superAdminIds(db);
}
