"use client";

import Link from "next/link";
import { Check, Clock, ExternalLink, MessageCircle, Phone } from "lucide-react";
import type { TaskType } from "@prisma/client";
import { TASK_TYPE_LABEL } from "@/lib/domain/labels";
import { waLink } from "@/lib/domain/phone";
import { friendlyIST, relativeTime, wallTime } from "@/lib/domain/time";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { completeTaskAction, snoozeTaskAction } from "./actions";

export interface TaskRow {
  id: string;
  type: TaskType;
  title: string;
  dueAt: Date;
  ruleCode: string | null;
  snoozed: boolean;
  lead: { id: string; ref: string; name: string; phone: string | null } | null;
}

const TONE: Record<string, string> = { red: "text-rose-600", amber: "text-amber-700" };

export function TaskList({ title, rows, tone }: { title: string; rows: TaskRow[]; tone?: "red" | "amber" }) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className={cn("mb-2 text-sm font-semibold tracking-wide uppercase", tone ? TONE[tone] : "text-slate-500")}>
        {title} · {rows.length}
      </h2>
      <div className="card divide-y divide-slate-100">
        {rows.map((t) => (
          <TaskItem key={t.id} t={t} overdue={tone === "red"} />
        ))}
      </div>
    </section>
  );
}

function TaskItem({ t, overdue }: { t: TaskRow; overdue: boolean }) {
  const { pending, run } = useServerAction();
  const now = new Date();
  return (
    <div className={cn("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", pending && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{TASK_TYPE_LABEL[t.type]}</span>
          {t.ruleCode && <span title="Created by an automation rule">🤖 {t.ruleCode}</span>}
          <span className={overdue ? "font-medium text-rose-600" : ""}>{t.snoozed ? `Snoozed until ${friendlyIST(t.dueAt, now)}` : overdue ? `${relativeTime(t.dueAt, now).replace(" ago", "")} overdue` : friendlyIST(t.dueAt, now)}</span>
        </div>
        <div className="mt-0.5 font-medium text-ink">{t.title}</div>
        {t.type === "OUT_OF_AREA_REVIEW" && (
          <div className="mt-0.5 text-xs text-slate-500">This enquiry is outside your service area. Either take it on from a branch, or send the polite &ldquo;we don&apos;t serve your area yet&rdquo; message.</div>
        )}
        {t.lead && (
          <Link href={`/dashboard/leads/${t.lead.id}`} className="text-xs text-slate-500 hover:underline">
            {t.lead.ref} · {t.lead.name}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {t.lead?.phone && (
          <>
            <a href={`tel:${t.lead.phone}`} className="btn-secondary px-3 py-2" aria-label="Call">
              <Phone className="size-4" />
            </a>
            <a href={waLink(t.lead.phone)} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-emerald-700" aria-label="WhatsApp">
              <MessageCircle className="size-4" />
            </a>
          </>
        )}
        {t.type === "OUT_OF_AREA_REVIEW" && (
          <Link href="/dashboard/queues?tab=out-of-area" className="btn px-3 py-2">
            Decide
          </Link>
        )}
        {t.lead && (
          <Link href={`/dashboard/leads/${t.lead.id}`} className="btn-secondary px-3 py-2" aria-label="Open lead">
            <ExternalLink className="size-4" />
          </Link>
        )}
        <button disabled={pending} onClick={() => run(() => snoozeTaskAction(t.id, new Date(Date.now() + 3600_000).toISOString()))} className="btn-secondary px-2.5 py-2 text-xs">
          <Clock className="size-3.5" /> 1h
        </button>
        <button disabled={pending} onClick={() => run(() => snoozeTaskAction(t.id, wallTime(new Date(), "11:00", "Asia/Kolkata", 1).toISOString()))} className="btn-secondary px-2.5 py-2 text-xs">
          Tomorrow
        </button>
        <button disabled={pending} onClick={() => run(() => completeTaskAction(t.id))} className="btn px-3 py-2">
          <Check className="size-4" /> Done
        </button>
      </div>
    </div>
  );
}
