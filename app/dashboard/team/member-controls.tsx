"use client";

import { useState } from "react";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { formatISTDate } from "@/lib/domain/time";
import { setOnLeaveAction, setReceivesLeadsAction } from "./actions";

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-40", checked ? "bg-amber-500" : "bg-slate-300")}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function LeaveToggle({ userId, onLeave, until, disabled }: { userId: string; onLeave: boolean; until: Date | null; disabled: boolean }) {
  const { pending, run } = useServerAction();
  const [date, setDate] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Switch checked={onLeave} disabled={disabled || pending} label="On leave" onChange={(v) => run(() => setOnLeaveAction(userId, v, v && date ? new Date(`${date}T23:59:00+05:30`).toISOString() : null))} />
      {onLeave ? (
        <span className="text-xs text-amber-700">{until ? `until ${formatISTDate(until)}` : "until further notice"}</span>
      ) : (
        !disabled && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-500" aria-label="Back on" title="Optional: back on this date" />
      )}
    </div>
  );
}

export function ReceivesToggle({ userId, value, disabled }: { userId: string; value: boolean; disabled: boolean }) {
  const { pending, run } = useServerAction();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label="Receives new leads"
      disabled={disabled || pending}
      onClick={() => run(() => setReceivesLeadsAction(userId, !value))}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-40", value ? "bg-emerald-500" : "bg-slate-300")}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition", value ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}
