import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { simulatedStatus } from "@/lib/domain/messaging/simulator";

/** Simulator ticks: move SENT → DELIVERED → READ based on elapsed time, whenever messages are viewed. */
export async function progressSimulatedMessages(where: Prisma.OutboundMessageWhereInput = {}, now = new Date()) {
  const pending = await prisma.outboundMessage.findMany({
    where: { AND: [where, { provider: "SIMULATOR", direction: "OUT", status: { in: ["SENT", "DELIVERED"] } }] },
    select: { id: true, status: true, createdAt: true },
    take: 500,
  });
  const updates = pending
    .map((m) => ({ id: m.id, next: simulatedStatus(m.status, m.createdAt, now), cur: m.status }))
    .filter((m) => m.next !== m.cur);
  for (const status of ["DELIVERED", "READ"] as const) {
    const ids = updates.filter((u) => u.next === status).map((u) => u.id);
    if (ids.length) await prisma.outboundMessage.updateMany({ where: { id: { in: ids } }, data: { status } });
  }
}
