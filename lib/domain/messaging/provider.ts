import type { MessageStatus } from "@prisma/client";

export interface OutgoingMessage {
  to: string;
  body: string;
  templateCode: string | null;
  language: string;
  variables: Record<string, string>;
}

export interface MessagingProvider {
  name: "SIMULATOR" | "META_CLOUD";
  send(msg: OutgoingMessage): Promise<{ providerMessageId: string; status: MessageStatus }>;
}
