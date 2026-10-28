import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export async function writeAudit(
  entry: { actorId?: string | null; action: string; entityType: string; entityId: string; summary: string; diff?: Prisma.InputJsonValue },
  db: Db = prisma,
) {
  await db.auditLog.create({ data: { ...entry, actorId: entry.actorId ?? null } });
}
