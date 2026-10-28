"use client";

import { useState } from "react";
import { useServerAction } from "@/lib/use-action";
import { markNoShowAction, markVisitedAction, rescheduleAction } from "./actions";

export function AppointmentActions({ id }: { id: string }) {
  const { pending, run } = useServerAction();
  const [moving, setMoving] = useState(false);
  const [when, setWhen] = useState("");
  if (moving) {
    return (
      <div className="flex gap-2">
        <input type="datetime-local" className="field py-1.5 text-xs" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="New date and time" />
        <button className="btn px-3 py-1.5 text-xs" disabled={!when || pending} onClick={() => run(() => rescheduleAction(id, new Date(`${when}:00+05:30`).toISOString()), () => setMoving(false))}>
          Save
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-1.5">
      <button className="btn px-3 py-1.5 text-xs" disabled={pending} onClick={() => run(() => markVisitedAction(id))}>
        Visited
      </button>
      <button className="btn-secondary px-3 py-1.5 text-xs" disabled={pending} onClick={() => run(() => markNoShowAction(id))}>
        No-show
      </button>
      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setMoving(true)}>
        Reschedule
      </button>
    </div>
  );
}
