import { Check, CheckCheck, Clock, TriangleAlert } from "lucide-react";
import type { MessageStatus } from "@prisma/client";

/** WhatsApp-style ticks: ✓ sent, ✓✓ delivered, blue ✓✓ read */
export function Ticks({ status }: { status: MessageStatus }) {
  switch (status) {
    case "QUEUED":
      return <Clock className="inline size-3.5 text-slate-400" aria-label="Queued" />;
    case "SENT":
      return <Check className="inline size-3.5 text-slate-400" aria-label="Sent" />;
    case "DELIVERED":
      return <CheckCheck className="inline size-3.5 text-slate-400" aria-label="Delivered" />;
    case "READ":
      return <CheckCheck className="inline size-3.5 text-sky-500" aria-label="Read" />;
    default:
      return <TriangleAlert className="inline size-3.5 text-rose-500" aria-label="Failed" />;
  }
}
