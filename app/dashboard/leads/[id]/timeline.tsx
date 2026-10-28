"use client";

import { useState } from "react";
import { ArrowRightLeft, Bell, CalendarClock, ClipboardCheck, Cog, Flag, Footprints, Mail, MessageCircle, Phone, Route, StickyNote, UserCheck, type LucideIcon } from "lucide-react";
import type { ActivityType, CallOutcome, MessageStatus } from "@prisma/client";
import { Ticks } from "@/components/ticks";
import { ACTIVITY_LABEL, CALL_OUTCOME_LABEL } from "@/lib/domain/labels";
import { formatIST } from "@/lib/domain/time";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  type: ActivityType;
  body: string;
  callOutcome: CallOutcome | null;
  createdAt: Date;
  actor: string | null;
  messageStatus: MessageStatus | null;
  messageBody: string | null;
}

const ICON: Partial<Record<ActivityType, [LucideIcon, string]>> = {
  NOTE: [StickyNote, "bg-amber-100 text-amber-700"],
  CALL: [Phone, "bg-sky-100 text-sky-700"],
  WHATSAPP: [MessageCircle, "bg-emerald-100 text-emerald-700"],
  MESSAGE_SENT: [MessageCircle, "bg-emerald-100 text-emerald-700"],
  EMAIL: [Mail, "bg-slate-100 text-slate-600"],
  STAGE_CHANGE: [Flag, "bg-violet-100 text-violet-700"],
  ASSIGNMENT: [UserCheck, "bg-brand/10 text-brand"],
  HANDOVER: [ArrowRightLeft, "bg-gold-light text-brand"],
  ROUTING: [Route, "bg-gold-light text-brand"],
  FOLLOW_UP_SET: [Bell, "bg-slate-100 text-slate-600"],
  APPOINTMENT: [CalendarClock, "bg-indigo-100 text-indigo-700"],
  SHOWROOM_VISIT: [Footprints, "bg-indigo-100 text-indigo-700"],
  MEETING: [Footprints, "bg-indigo-100 text-indigo-700"],
  TASK: [ClipboardCheck, "bg-slate-100 text-slate-600"],
  SYSTEM: [Cog, "bg-slate-100 text-slate-500"],
};

const FILTERS: { key: string; label: string; types: ActivityType[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "calls", label: "Calls", types: ["CALL"] },
  { key: "messages", label: "Messages", types: ["MESSAGE_SENT", "WHATSAPP", "EMAIL"] },
  { key: "notes", label: "Notes", types: ["NOTE", "MEETING", "SHOWROOM_VISIT", "APPOINTMENT"] },
  { key: "system", label: "System", types: ["SYSTEM", "ROUTING", "ASSIGNMENT", "HANDOVER", "STAGE_CHANGE", "FOLLOW_UP_SET", "TASK"] },
];

export function Timeline({ activities }: { activities: TimelineItem[] }) {
  const [filter, setFilter] = useState("all");
  const types = FILTERS.find((f) => f.key === filter)?.types;
  const shown = types ? activities.filter((a) => types.includes(a.type)) : activities;

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5">
        <h2 className="mr-auto text-sm font-semibold text-ink">Timeline</h2>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={cn("rounded-full px-2.5 py-1 text-xs", filter === f.key ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100")}>
            {f.label}
          </button>
        ))}
      </div>
      <ol className="relative space-y-4 p-4">
        {shown.map((a) => {
          const [Icon, tone] = ICON[a.type] ?? [Cog, "bg-slate-100 text-slate-500"];
          return (
            <li key={a.id} className="flex gap-3">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{a.callOutcome ? `Call · ${CALL_OUTCOME_LABEL[a.callOutcome]}` : ACTIVITY_LABEL[a.type]}</span>
                  <span>{a.actor ?? "Elementra CRM"}</span>
                  <span>· {formatIST(a.createdAt)}</span>
                </div>
                <div className="mt-0.5 text-sm whitespace-pre-line text-slate-800">{a.body}</div>
                {a.messageBody && (
                  <div className="mt-2 max-w-md rounded-lg rounded-tl-none bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                    {a.messageBody}
                    {a.messageStatus && (
                      <div className="mt-1 text-right text-[11px] text-slate-500">
                        <Ticks status={a.messageStatus} /> {a.messageStatus.toLowerCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Nothing here yet.</li>}
      </ol>
    </div>
  );
}
