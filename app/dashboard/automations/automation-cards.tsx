"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Loader2, Play } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import type { Settings } from "@/lib/domain/settings";
import type { EngineSummary } from "@/lib/domain/reminders/engine";
import { relativeTime } from "@/lib/domain/time";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { runRemindersNowAction } from "../reminder-actions";
import { saveSettingsAction } from "../settings/actions";

export interface RuleCard {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  firedToday: number;
  firedWeek: number;
  recent: { at: Date; text: string; leadId: string | null }[];
}

export function RunNow() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-gold"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await runRemindersNowAction();
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          window.dispatchEvent(new Event("elementra:poll"));
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run now
    </button>
  );
}

function Threshold({ code, settings, canEditSla }: { code: string; settings: Settings; canEditSla: boolean }) {
  const { pending, run } = useServerAction();
  const [v, setV] = useState(() => {
    switch (code) {
      case "R1":
        return String(settings.sla.firstContactMins);
      case "R1b":
        return String(settings.sla.escalateMins);
      case "R4":
        return String(settings.reminders.appointmentHours);
      case "R6":
        return String(settings.reminders.noResponseCalls);
      default:
        return "";
    }
  });
  const meta: Record<string, { unit: string; save: () => ReturnType<typeof saveSettingsAction>; sla?: boolean }> = {
    R1: { unit: "working min", save: () => saveSettingsAction("sla", { firstContactMins: Number(v) }), sla: true },
    R1b: { unit: "working min", save: () => saveSettingsAction("sla", { escalateMins: Number(v) }), sla: true },
    R4: { unit: "hours before", save: () => saveSettingsAction("reminders", { appointmentHours: Number(v) }) },
    R6: { unit: "unanswered calls", save: () => saveSettingsAction("reminders", { noResponseCalls: Number(v) }) },
  };
  const m = meta[code];
  if (code === "R3") return <Link href="/dashboard/settings?tab=hours" className="text-xs text-brand hover:underline">Days per stage →</Link>;
  if (code === "R9") return <span className="text-xs text-slate-500">After {settings.reminders.digestTime} IST</span>;
  if (!m) return null;
  const locked = m.sla && !canEditSla;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <input className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right" inputMode="numeric" value={v} disabled={locked} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} aria-label={`${code} threshold`} />
      <span className="text-slate-500">{m.unit}</span>
      {!locked && (
        <button className="text-brand hover:underline disabled:opacity-50" disabled={pending} onClick={() => run(m.save)}>
          Save
        </button>
      )}
    </span>
  );
}

export function AutomationCards({ cards, settings, canEditSla, lastRun }: { cards: RuleCard[]; settings: Settings; canEditSla: boolean; lastRun: EngineSummary | null }) {
  const { pending, run } = useServerAction();
  const toggle = (code: string, on: boolean) => {
    const disabled = new Set(settings.reminders.disabledRules);
    if (on) disabled.delete(code);
    else disabled.add(code);
    run(() => saveSettingsAction("reminders", { disabledRules: [...disabled] }));
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Bot className="size-4 text-gold" />
        {lastRun ? (
          <>
            Last run {relativeTime(lastRun.ranAt)} · {lastRun.evaluatedLeads} leads checked · {lastRun.tasksCreated} tasks, {lastRun.notificationsCreated} notifications, {lastRun.messagesSent} messages created
          </>
        ) : (
          "Not run yet"
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.code} className={cn("flex flex-col p-4", !c.enabled && "opacity-60")}>
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-white">{c.code}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{c.name}</div>
                <p className="mt-0.5 text-sm text-slate-600">{c.description}</p>
              </div>
              <button
                role="switch"
                aria-checked={c.enabled}
                aria-label={`${c.name} enabled`}
                disabled={pending}
                onClick={() => toggle(c.code, !c.enabled)}
                className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition", c.enabled ? "bg-emerald-500" : "bg-slate-300")}
              >
                <span className={cn("inline-block size-5 rounded-full bg-white shadow transition", c.enabled ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Threshold code={c.code} settings={settings} canEditSla={canEditSla} />
              <span className="ml-auto flex gap-1.5">
                <Chip className={c.firedToday ? "bg-gold-light text-brand ring-gold/40" : undefined}>{c.firedToday} today</Chip>
                <Chip>{c.firedWeek} this week</Chip>
              </span>
            </div>
            {c.recent.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                {c.recent.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-16 shrink-0 text-slate-400">{relativeTime(f.at)}</span>
                    {f.leadId ? (
                      <Link href={`/dashboard/leads/${f.leadId}`} className="truncate hover:underline">
                        {f.text}
                      </Link>
                    ) : (
                      <span className="truncate">{f.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
