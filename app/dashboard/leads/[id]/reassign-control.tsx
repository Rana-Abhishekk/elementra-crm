"use client";

import { useServerAction } from "@/lib/use-action";
import { reassignAction } from "../actions";

export function ReassignControl({ leadId, ownerId, people }: { leadId: string; ownerId: string | null; people: { id: string; name: string; branch: string; onLeave: boolean }[] }) {
  const { pending, run } = useServerAction();
  return (
    <label className="inline-flex items-center gap-1.5 text-slate-600">
      Owner:
      <select
        aria-label="Reassign owner"
        disabled={pending}
        value={ownerId ?? ""}
        onChange={(e) => e.target.value && run(() => reassignAction(leadId, e.target.value))}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
      >
        {!ownerId && <option value="">Unassigned</option>}
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.branch}
            {p.onLeave ? " (on leave)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
