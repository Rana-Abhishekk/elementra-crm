"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { canTransition, type StageRef } from "@/lib/domain/stages";
import { useServerAction } from "@/lib/use-action";
import { changeStageAction, moveToPipelineAction } from "../actions";

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const WON = "__won__";
const LOST = "__lost__";

/**
 * Stage dropdown built from the lead's pipeline (Masters → Pipelines & Statuses). Lost opens a picker of the
 * pipeline's Lost stages (+ revive date where the stage asks for one); Won asks for the order value.
 */
export function StageControl({
  leadId,
  stageId,
  stages,
  pipelineId,
  pipelines,
  editable,
  canReopen,
  possessionDate,
  orderValue,
}: {
  leadId: string;
  stageId: string;
  /** Every stage of the lead's pipeline (the current one included even if it was deactivated) */
  stages: StageRef[];
  pipelineId: string;
  pipelines: { id: string; name: string }[];
  editable: boolean;
  canReopen: boolean;
  possessionDate: Date | null;
  orderValue: number | null;
}) {
  const { pending, run } = useServerAction();
  const [modal, setModal] = useState<"LOST" | "WON" | null>(null);
  const current = stages.find((s) => s.id === stageId)!;
  const active = stages.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const open = active.filter((s) => s.category === "OPEN");
  const won = active.filter((s) => s.category === "WON");
  const lost = active.filter((s) => s.category === "LOST");
  const closedAllowed = current.category === "OPEN";

  function onChange(value: string) {
    if (value === LOST) return setModal("LOST");
    if (value === WON) return setModal("WON");
    run(() => changeStageAction(leadId, { stageId: value }));
  }

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-72">
      <select aria-label="Stage" disabled={!editable || pending} value={current.category === "OPEN" ? stageId : current.id} onChange={(e) => onChange(e.target.value)} className="field w-full font-medium">
        {current.category !== "OPEN" || !current.isActive ? (
          <option value={current.id}>
            {current.label}
            {current.isActive ? "" : " (inactive)"}
          </option>
        ) : null}
        {open.map((s) => (
          <option key={s.id} value={s.id} disabled={s.id !== stageId && !canTransition(stages, current, s, canReopen)}>
            {s.label}
          </option>
        ))}
        {won.length > 0 && (
          <option value={WON} disabled={!closedAllowed}>
            {won.length === 1 ? won[0].label : "Won…"}
          </option>
        )}
        {lost.length > 0 && (
          <option value={LOST} disabled={!closedAllowed}>
            Closed lost…
          </option>
        )}
      </select>
      {editable && pipelines.length > 1 && (
        <select
          aria-label="Pipeline"
          disabled={pending}
          value={pipelineId}
          onChange={(e) => {
            const name = pipelines.find((p) => p.id === e.target.value)?.name;
            if (window.confirm(`Move this lead to "${name}"? It goes to the stage there that matches its current one.`)) run(() => moveToPipelineAction(leadId, e.target.value));
          }}
          className="field w-full py-1 text-xs text-slate-600"
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              Pipeline: {p.name}
            </option>
          ))}
        </select>
      )}
      <LostModal open={modal === "LOST"} onClose={() => setModal(null)} leadId={leadId} stages={lost} possessionDate={possessionDate} />
      <WonModal open={modal === "WON"} onClose={() => setModal(null)} leadId={leadId} stages={won} orderValue={orderValue} />
    </div>
  );
}

export function LostModal({
  open,
  onClose,
  leadId,
  stages,
  possessionDate,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  /** The pipeline's active Lost stages */
  stages: StageRef[];
  possessionDate: Date | null;
  onDone?: () => void;
}) {
  const { pending, run } = useServerAction();
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [revive, setRevive] = useState(() => toDateInput(possessionDate ? new Date(possessionDate.getTime() - 30 * 86400_000) : new Date(Date.now() + 30 * 86400_000)));
  const chosen = stages.find((s) => s.id === stageId) ?? stages[0];

  return (
    <Modal open={open} onClose={onClose} title="Close as lost">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStageId(s.id)}
              className={chosen?.id === s.id ? "rounded-md border border-brand bg-brand px-3 py-2 text-left text-sm text-white" : "rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"}
            >
              {s.label}
            </button>
          ))}
        </div>
        {chosen?.askReviveDate && (
          <label className="block text-sm">
            <span className="label">Remind me on (revive date)</span>
            <input type="date" className="field" value={revive} onChange={(e) => setRevive(e.target.value)} />
            <span className="mt-1 block text-xs text-slate-500">{possessionDate ? "Defaults to a month before possession." : "Defaults to 30 days from today."}</span>
          </label>
        )}
        <label className="block text-sm">
          <span className="label">Note{chosen?.requiresNote ? " (required)" : " (optional)"}</span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Went with a local carpenter" />
        </label>
        <button
          className="btn w-full"
          disabled={pending || !chosen || (chosen.requiresNote && !note.trim())}
          onClick={() =>
            run(
              () => changeStageAction(leadId, { stageId: chosen!.id, lostNote: note || null, reviveAt: chosen!.askReviveDate ? new Date(`${revive}T10:00:00+05:30`) : null }),
              () => {
                onClose();
                onDone?.();
              },
            )
          }
        >
          Close as {chosen?.label ?? "lost"}
        </button>
      </div>
    </Modal>
  );
}

export function WonModal({ open, onClose, leadId, stages, orderValue }: { open: boolean; onClose: () => void; leadId: string; stages: StageRef[]; orderValue: number | null }) {
  const { pending, run } = useServerAction();
  const [value, setValue] = useState(orderValue ? String(orderValue) : "");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  return (
    <Modal open={open} onClose={onClose} title="Mark as won 🎉">
      <div className="space-y-4">
        {stages.length > 1 && (
          <label className="block text-sm">
            <span className="label">Won stage</span>
            <select className="field" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          <span className="label">Order value (₹)</span>
          <input className="field" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1250000" />
        </label>
        <p className="text-xs text-slate-500">A deal is created and a post-sale project opens at &ldquo;Re-verify measurement&rdquo;.</p>
        <button className="btn w-full" disabled={pending || !stageId} onClick={() => run(() => changeStageAction(leadId, { stageId, orderValueInr: value ? Number(value) : null }), onClose)}>
          Mark as {stages.find((s) => s.id === stageId)?.label ?? "won"}
        </button>
      </div>
    </Modal>
  );
}
