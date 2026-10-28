// Simulated inbound WhatsApp replies (demo mode only)
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/domain/notify";

const REPLIES = [
  "Yes, please call me after 6 pm.",
  "Can you share some kitchen photos and a rough price range?",
  "We get possession in March. Can we visit the showroom this Saturday?",
  "Thanks! Sharing the floor plan shortly.",
  "Haan, kal shaam ko call kijiye.",
  "Is the quotation including appliances?",
];

export async function simulateCustomerReply(leadId?: string) {
  const lead = leadId
    ? await prisma.lead.findUnique({ where: { id: leadId } })
    : await prisma.lead.findFirst({ where: { phoneE164: { not: null }, messages: { some: {} }, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }, orderBy: { lastActivityAt: "desc" } });
  if (!lead?.phoneE164) return null;
  const body = REPLIES[Math.floor(Math.random() * REPLIES.length)];
  const now = new Date();
  const msg = await prisma.outboundMessage.create({
    data: { leadId: lead.id, direction: "IN", toPhone: lead.phoneE164, body, status: "READ", provider: "SIMULATOR", createdAt: now },
  });
  await prisma.activity.create({ data: { leadId: lead.id, type: "WHATSAPP", body: `Customer replied on WhatsApp: “${body}”`, meta: { messageId: msg.id, inbound: true }, createdAt: now } });
  await prisma.lead.update({ where: { id: lead.id }, data: { lastActivityAt: now } });
  if (lead.ownerId) {
    await notify({ userId: lead.ownerId, type: "WHATSAPP_REPLY", title: `WhatsApp reply from ${lead.firstName} (${lead.refCode})`, body, leadId: lead.id, href: `/dashboard/inbox?lead=${lead.id}`, dedupeKey: `IN:${msg.id}` });
  }
  return { lead, body };
}
