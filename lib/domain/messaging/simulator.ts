// WhatsApp simulator: nothing leaves the server. Delivery ticks are derived from elapsed time
// when the inbox/outbox is read (no background workers).
import type { MessageStatus } from "@prisma/client";
import type { MessagingProvider } from "./provider";

export const simulatorProvider: MessagingProvider = {
  name: "SIMULATOR",
  async send() {
    return { providerMessageId: `SIM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: "SENT" };
  },
};

const DELIVERED_AFTER_MS = 3_000;
const READ_AFTER_MS = 20_000;

/** The status a simulated message should show `now`. Never moves backwards; FAILED/QUEUED stay. */
export function simulatedStatus(current: MessageStatus, createdAt: Date, now: Date): MessageStatus {
  if (current === "FAILED" || current === "QUEUED" || current === "READ") return current;
  const age = now.getTime() - createdAt.getTime();
  if (age >= READ_AFTER_MS) return "READ";
  if (age >= DELIVERED_AFTER_MS) return "DELIVERED";
  return current;
}
