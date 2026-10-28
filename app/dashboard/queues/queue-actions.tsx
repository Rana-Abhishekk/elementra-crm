"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useServerAction } from "@/lib/use-action";
import { acceptOutOfAreaAction, captureLocationAction, reassignAction, regretOutOfAreaAction } from "../leads/actions";

export function CaptureLocation({ leadId }: { leadId: string }) {
  const { pending, run } = useServerAction();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => captureLocationAction(leadId, value));
      }}
    >
      <div className="relative flex-1">
        <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
        <input className="field pl-8" placeholder="Add pincode / area, e.g. Borivalli west" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Site area or pincode" />
      </div>
      <button className="btn" disabled={pending || value.trim().length < 2}>
        {pending ? "Routing…" : "Save"}
      </button>
    </form>
  );
}

export function OutOfAreaActions({ leadId, branches, defaultBranchId, hasPhone }: { leadId: string; branches: { id: string; name: string }[]; defaultBranchId?: string; hasPhone: boolean }) {
  const { pending, run } = useServerAction();
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="btn shrink-0" disabled={pending || !branchId} onClick={() => run(() => acceptOutOfAreaAction(leadId, branchId))}>
          Accept for branch
        </button>
      </div>
      <div className="flex gap-2">
        {hasPhone && (
          <button className="btn-secondary flex-1" disabled={pending} onClick={() => run(() => regretOutOfAreaAction(leadId, true))}>
            Send regret & close
          </button>
        )}
        <button className="btn-ghost flex-1" disabled={pending} onClick={() => run(() => regretOutOfAreaAction(leadId, false))}>
          Close as Lost
        </button>
      </div>
    </div>
  );
}

export function AssignUnassigned({ leadId, people }: { leadId: string; people: { id: string; name: string; branch: string }[] }) {
  const { pending, run } = useServerAction();
  const [owner, setOwner] = useState("");
  return (
    <div className="flex gap-2">
      <select className="field" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Assign to">
        <option value="">Assign to…</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.branch}
          </option>
        ))}
      </select>
      <button className="btn shrink-0" disabled={pending || !owner} onClick={() => run(() => reassignAction(leadId, owner))}>
        Assign
      </button>
    </div>
  );
}
