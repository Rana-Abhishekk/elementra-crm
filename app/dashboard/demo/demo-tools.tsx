"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Bot, FileSpreadsheet, MessageCircle } from "lucide-react";
import { FeatureBadge } from "@/components/feature-badge";
import { runRemindersNowAction } from "../reminder-actions";
import { simulateReplyAction } from "../inbox/actions";
import { simulateSheetRowAction } from "./actions";
import { ResetDemo } from "./reset-demo";

export function DemoTools() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
      window.dispatchEvent(new Event("elementra:poll"));
      router.refresh();
    });

  const tools = [
    { icon: Bot, title: "Run reminders now", hint: "Evaluates rules R1–R9 immediately (normally every minute / daily on Vercel)", run: () => go(runRemindersNowAction) },
    { icon: MessageCircle, title: "Simulate customer WhatsApp reply", hint: "Adds an inbound message to the latest conversation", run: () => go(() => simulateReplyAction()), badge: "F24" },
    { icon: FileSpreadsheet, title: "Simulate Google Sheet row", hint: "Ingests one row in your Sales Pipeline sheet format", run: () => go(simulateSheetRowAction), badge: "F6" },
  ];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Engine & simulators</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((t) => (
          <button key={t.title} disabled={pending} onClick={t.run} className="card flex items-start gap-3 p-4 text-left hover:border-gold disabled:opacity-60">
            <t.icon className="mt-0.5 size-5 shrink-0 text-gold" />
            <span>
              <span className="flex items-center gap-2 font-medium text-ink">
                {t.title} {t.badge && <FeatureBadge feature={t.badge} />}
              </span>
              <span className="block text-xs text-slate-500">{t.hint}</span>
            </span>
          </button>
        ))}
        <ResetDemo />
      </div>
    </section>
  );
}
