// Sends a WhatsApp template to a lead through the configured provider and logs it on the timeline.
import { Prisma, type OutboundMessage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productPhrase } from "@/lib/domain/labels";
import { shortBranch } from "@/lib/domain/routing/decide";
import { renderTemplate } from "./render";
import { simulatorProvider } from "./simulator";
import { metaCloudConfigured, metaCloudProvider } from "./metaCloud";
import type { MessagingProvider } from "./provider";

export function activeProvider(): MessagingProvider {
  // The Cloud API stays off unless both env vars exist — the demo always uses the simulator
  return metaCloudConfigured() ? metaCloudProvider : simulatorProvider;
}

export const mapLink = (lat: number | null, lng: number | null) => (lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : "");

export interface SendTemplateInput {
  leadId: string;
  templateCode: string;
  language?: string;
  vars?: Record<string, string>;
  dedupeKey?: string;
  sentById?: string | null;
  createdAt?: Date;
}

/** Returns the message, or null if there's no phone / no template / it was already sent (dedupeKey). */
export async function sendTemplate(input: SendTemplateInput): Promise<OutboundMessage | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: { branch: true, owner: { select: { name: true } }, locality: { select: { name: true } } },
  });
  if (!lead?.phoneE164) return null;
  const language = input.language ?? lead.language ?? "en";
  const template =
    (await prisma.messageTemplate.findUnique({ where: { code_language: { code: input.templateCode, language } } })) ??
    (await prisma.messageTemplate.findUnique({ where: { code_language: { code: input.templateCode, language: "en" } } }));
  if (!template) return null;

  const vars: Record<string, string> = {
    name: lead.firstName,
    product: productPhrase(lead.products),
    branch: lead.branch && lead.branch.kind === "EXPERIENCE_CENTRE" ? shortBranch(lead.branch.name) : "nearest",
    rep_name: lead.owner?.name ?? "our team",
    map_link: mapLink(lead.branch?.lat ?? null, lead.branch?.lng ?? null),
    location: lead.locality?.name ?? lead.siteAddressRaw ?? "your location",
    ...input.vars,
  };
  const body = renderTemplate(template.body, vars);
  const provider = activeProvider();

  if (input.dedupeKey) {
    const exists = await prisma.outboundMessage.findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true } });
    if (exists) return null;
  }

  let result: { providerMessageId: string; status: OutboundMessage["status"] };
  let error: string | null = null;
  try {
    result = await provider.send({ to: lead.phoneE164, body, templateCode: template.code, language: template.language, variables: vars });
  } catch (e) {
    result = { providerMessageId: "", status: "FAILED" };
    error = e instanceof Error ? e.message : "Send failed";
  }

  try {
    const createdAt = input.createdAt ?? new Date();
    const message = await prisma.outboundMessage.create({
      data: {
        leadId: lead.id,
        templateCode: template.code,
        language: template.language,
        toPhone: lead.phoneE164,
        body,
        status: result.status,
        provider: provider.name,
        providerMessageId: result.providerMessageId || null,
        error,
        sentById: input.sentById ?? null,
        dedupeKey: input.dedupeKey ?? null,
        createdAt,
      },
    });
    const via = provider.name === "SIMULATOR" ? "Simulator" : "WhatsApp Cloud API";
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "MESSAGE_SENT",
        body: `WhatsApp "${template.name}" (${template.language.toUpperCase()}) ${error ? `failed: ${error}` : "sent"} · ${via}`,
        meta: { messageId: message.id, templateCode: template.code, auto: !input.sentById },
        userId: input.sentById ?? null,
        createdAt,
      },
    });
    if (input.sentById && !lead.firstContactedAt) {
      await prisma.lead.update({ where: { id: lead.id }, data: { firstContactedAt: createdAt } });
    }
    return message;
  } catch (e) {
    // Two engine runs racing on the same dedupeKey: the second one is a no-op
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
    throw e;
  }
}
