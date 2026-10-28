// WhatsApp Cloud API provider — STUB. Used only when WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are set.
// Not exercised in the demo; untested against the live API.
import type { MessagingProvider, OutgoingMessage } from "./provider";

const GRAPH_VERSION = "v21.0";

export function metaCloudConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
}

/** Request shape for a template message (POST /{phone-number-id}/messages). */
export function buildTemplateRequest(msg: OutgoingMessage, phoneNumberId: string) {
  return {
    url: `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    body: {
      messaging_product: "whatsapp",
      to: msg.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: msg.templateCode,
        language: { code: msg.language === "hi" ? "hi" : "en" },
        components: [{ type: "body", parameters: Object.values(msg.variables).map((text) => ({ type: "text", text })) }],
      },
    },
  };
}

export const metaCloudProvider: MessagingProvider = {
  name: "META_CLOUD",
  async send(msg) {
    const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!id || !token) throw new Error("WhatsApp Cloud API is not connected");
    const req = buildTemplateRequest(msg, id);
    const res = await fetch(req.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok || !data.messages?.[0]) throw new Error(data.error?.message ?? "WhatsApp send failed");
    return { providerMessageId: data.messages[0].id, status: "SENT" };
  },
};
