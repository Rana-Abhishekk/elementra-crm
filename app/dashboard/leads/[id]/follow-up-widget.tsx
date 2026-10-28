"use client";

import { useState } from "react";
import { AlarmClock } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { friendlyIST, wallTime } from "@/lib/domain/time";
import { useServerAction } from "@/lib/use-action";
import { setFollowUpAction } from "../actions";

export function followUpPresets(now = new Date()) {
  const today6 = wallTime(now, "18:00");
  return [
    ...(today6 > now ? [{ label: "Today 6 PM", at: today6 }] : []),
    { label: "Tomorrow", at: wallTime(now, "11:00", "Asia/Kolkata", 1) },
    { label: "+3 days", at: wallTime(now, "11:00", "Asia/Kolkata", 3) },
    { label: "Next week", at: wallTime(now, "11:00", "Asia/Kolkata", 7) },
  ];
}

export function FollowUpWidget({ leadId, nextFollowUpAt, editable, badge }: { leadId: string; nextFollowUpAt: Date | null; editable: boolean; badge: React.ReactNode }) {
  const { pending, run } = useServerAction();
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState("");
  const set = (at: Date) => run(() => setFollowUpAction(leadId, at.toISOString(), note), () => setNote(""));

  return (
    <Card id="follow-up">
      <CardHeader title={<span className="inline-flex items-center gap-1.5"><AlarmClock className="size-4 text-gold" /> Next follow-up</span>} />
      <div className="space-y-3 p-4">
        <div className="text-sm">
          {nextFollowUpAt ? <span className="font-medium text-ink">{friendlyIST(nextFollowUpAt)}</span> : <span className="text-slate-500">Not set</span>}
          <div className="mt-1">{badge}</div>
        </div>
        {editable && (
          <>
            <input className="field" placeholder="What to do (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {followUpPresets().map((p) => (
                <button key={p.label} disabled={pending} onClick={() => set(p.at)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand hover:bg-slate-50">
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="datetime-local" className="field py-1.5 text-xs" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Pick date and time" />
              <button disabled={!custom || pending} onClick={() => set(new Date(`${custom}:00+05:30`))} className="btn-secondary px-3 py-1.5 text-xs">
                Set
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
