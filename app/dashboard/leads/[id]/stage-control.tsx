"use client";

import { useState } from "react";
import type { LeadStage, LostReason } from "@prisma/client";
import { Modal } from "@/components/modal";
import { LOST_REASONS, LOST_REASON_LABEL, OPEN_STAGES, STAGE_LABEL, canTransition, stageLabel } from "@/lib/domain/stages";
import { useServerAction } from "@/lib/use-action";
import { changeStageAction } from "../actions";

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

/** Stage dropdown; Lost asks for the reason (+ revive date for On hold / Timeline), Won asks for the order value. */
export function StageControl({
  leadId,
  stage,
  lostReason,
  editable,
  canReopen,
  possessionDate,
  orderValue,
}: {
  leadId: string;
  stage: LeadStage;
  lostReason: LostReason | null;
  editable: boolean;
  canReopen: boolean;
  possessionDate: Date | null;
  orderValue: number | null;
}) {
  const { pending, run } = useServerAction();
  const [modal, setModal] = useState<"LOST" | "WON" | null>(null);
  const options = [...OPEN_STAGES, "CLOSED_WON", "CLOSED_LOST"] as LeadStage[];

  function onChange(to: LeadStage) {
    if (to === "CLOSED_LOST") return setModal("LOST");
    if (to === "CLOSED_WON") return setModal("WON");
    run(() => changeStageAction(leadId, { stage: to }));
  }

  return (
    <>
      <select
        aria-label="Stage"
        disabled={!editable || pending}
        value={stage}
        onChange={(e) => onChange(e.target.value as LeadStage)}
        className="field w-full font-medium sm:w-72"
      >
        {options.map((s) => (
          <option key={s} value={s} disabled={s !== stage && !canTransition(stage, s, canReopen)}>
            {s === stage ? stageLabel(s, lostReason) : s === "CLOSED_LOST" ? "Closed Lost…" : STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      <LostModal open={modal === "LOST"} onClose={() => setModal(null)} leadId={leadId} possessionDate={possessionDate} />
      <WonModal open={modal === "WON"} onClose={() => setModal(null)} leadId={leadId} orderValue={orderValue} />
    </>
  );
}

export function LostModal({ open, onClose, leadId, possessionDate, onDone }: { open: boolean; onClose: () => void; leadId: string; possessionDate: Date | null; onDone?: () => void }) {
  const { pending, run } = useServerAction();
  const [reason, setReason] = useState<LostReason>("NO_RESPONSE");
  const [note, setNote] = useState("");
  const [revive, setRevive] = useState(() => toDateInput(possessionDate ? new Date(possessionDate.getTime() - 30 * 86400_000) : new Date(Date.now() + 30 * 86400_000)));
  const needsRevive = reason === "ON_HOLD" || reason === "TIMELINE";

  return (
    <Modal open={open} onClose={onClose} title="Close as lost">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {LOST_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={reason === r ? "rounded-md border border-brand bg-brand px-3 py-2 text-sm text-white" : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"}
            >
              {LOST_REASON_LABEL[r]}
            </button>
          ))}
        </div>
        {needsRevive && (
          <label className="block text-sm">
            <span className="label">Remind me on (revive date)</span>
            <input type="date" className="field" value={revive} onChange={(e) => setRevive(e.target.value)} />
            <span className="mt-1 block text-xs text-slate-500">{possessionDate ? "Defaults to a month before possession." : "Defaults to 30 days from today."}</span>
          </label>
        )}
        <label className="block text-sm">
          <span className="label">Note (optional)</span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Went with a local carpenter" />
        </label>
        <button
          className="btn w-full"
          disabled={pending}
          onClick={() =>
            run(
              () => changeStageAction(leadId, { stage: "CLOSED_LOST", lostReason: reason, lostNote: note || null, reviveAt: needsRevive ? new Date(`${revive}T10:00:00+05:30`) : null }),
              () => {
                onClose();
                onDone?.();
              },
            )
          }
        >
          Close as {stageLabel("CLOSED_LOST", reason)}
        </button>
      </div>
    </Modal>
  );
}

export function WonModal({ open, onClose, leadId, orderValue }: { open: boolean; onClose: () => void; leadId: string; orderValue: number | null }) {
  const { pending, run } = useServerAction();
  const [value, setValue] = useState(orderValue ? String(orderValue) : "");
  return (
    <Modal open={open} onClose={onClose} title="Mark as won 🎉">
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="label">Order value (₹)</span>
          <input className="field" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1250000" />
        </label>
        <p className="text-xs text-slate-500">A deal is created and a post-sale project opens at &ldquo;Re-verify measurement&rdquo;.</p>
        <button className="btn w-full" disabled={pending} onClick={() => run(() => changeStageAction(leadId, { stage: "CLOSED_WON", orderValueInr: value ? Number(value) : null }), onClose)}>
          Mark as Closed Won
        </button>
      </div>
    </Modal>
  );
}
