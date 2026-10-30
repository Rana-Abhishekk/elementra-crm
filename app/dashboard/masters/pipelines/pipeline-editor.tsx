"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, GitMerge, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { StageCategory } from "@prisma/client";
import { Modal } from "@/components/modal";
import { Card, CardHeader, Chip } from "@/components/ui";
import { CATEGORY_LABEL, chipStyle } from "@/lib/domain/stages";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { MergeModal } from "../simple-master";
import {
  deleteStageAction,
  duplicatePipelineAction,
  mergeStageAction,
  movePipelineAction,
  moveStageAction,
  savePipelineAction,
  saveStageAction,
  setDefaultPipelineAction,
} from "../actions";

interface PipelineRow {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  leads: number;
  autoProductIds: string[];
}

interface StageRow {
  id: string;
  label: string;
  category: StageCategory;
  color: string;
  isInitial: boolean;
  isActive: boolean;
  requiresQualification: boolean;
  askReviveDate: boolean;
  requiresNote: boolean;
  staleDays: number | null;
  staleTaskType: string | null;
  probability: number | null;
  usedBy: number;
}

const PALETTE = ["#64748B", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#F59E0B", "#F97316", "#10B981", "#E11D48", "#BE123C", "#F43F5E", "#94A3B8", "#0D9488"];

export function PipelineEditor({ pipelines, selectedId, stages, products }: { pipelines: PipelineRow[]; selectedId: string; stages: StageRow[]; products: { id: string; name: string }[] }) {
  const { pending, run } = useServerAction();
  const [editPipeline, setEditPipeline] = useState<PipelineRow | "new" | null>(null);
  const [editStage, setEditStage] = useState<StageRow | "new" | null>(null);
  const [merging, setMerging] = useState<StageRow | null>(null);
  const selected = pipelines.find((p) => p.id === selectedId)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Left: pipelines */}
      <Card className="self-start">
        <CardHeader
          title="Pipelines"
          action={
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditPipeline("new")}>
              <Plus className="size-3.5" /> New
            </button>
          }
        />
        <ul className="divide-y divide-slate-100">
          {pipelines.map((p, i) => (
            <li key={p.id} className={cn("flex items-center gap-2 px-3 py-2.5", p.id === selectedId && "bg-gold-light/40")}>
              <Link href={`?id=${p.id}`} className="min-w-0 flex-1">
                <div className={cn("truncate text-sm font-medium", p.isActive ? "text-ink" : "text-slate-400")}>
                  {p.isDefault && <Star className="mr-1 inline size-3.5 fill-gold text-gold" />}
                  {p.name}
                </div>
                <div className="text-xs text-slate-500">
                  {p.leads} leads{!p.isActive ? " · inactive" : ""}
                </div>
              </Link>
              <div className="flex flex-col">
                <button disabled={pending || i === 0} onClick={() => run(() => movePipelineAction(p.id, -1))} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="size-3" />
                </button>
                <button disabled={pending || i === pipelines.length - 1} onClick={() => run(() => movePipelineAction(p.id, 1))} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="size-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Right: the selected pipeline's stages */}
      <div className="min-w-0 space-y-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-ink">{selected.name}</h2>
                {selected.isDefault && <Chip className="bg-gold-light text-brand ring-gold">Default</Chip>}
                {!selected.isActive && <Chip>Inactive</Chip>}
              </div>
              {selected.description && <p className="text-sm text-slate-500">{selected.description}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {selected.autoProductIds.length
                  ? `New leads with ${selected.autoProductIds.map((id) => products.find((p) => p.id === id)?.name ?? "?").join(" / ")} start here automatically.`
                  : selected.isDefault
                    ? "New leads start here unless another pipeline matches their products."
                    : "No auto-selection: leads are moved here by hand from the lead page."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary py-1.5" onClick={() => setEditPipeline(selected)}>
                <Pencil className="size-3.5" /> Edit
              </button>
              <button className="btn-secondary py-1.5" disabled={pending} onClick={() => run(() => duplicatePipelineAction(selected.id))}>
                <Copy className="size-3.5" /> Duplicate
              </button>
              {!selected.isDefault && (
                <button className="btn-secondary py-1.5" disabled={pending || !selected.isActive} onClick={() => run(() => setDefaultPipelineAction(selected.id))}>
                  <Star className="size-3.5" /> Make default
                </button>
              )}
              <Link href={`/dashboard/pipeline?pipeline=${selected.id}`} className="btn-ghost py-1.5">
                Open kanban →
              </Link>
            </div>
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <CardHeader
            title={`Stages (${stages.filter((s) => s.isActive).length} active)`}
            action={
              <button className="btn py-1 text-xs" onClick={() => setEditStage("new")}>
                <Plus className="size-3.5" /> Add stage
              </button>
            }
          />
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="w-14 p-2.5">Order</th>
                <th className="p-2.5">Heading</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Rules</th>
                <th className="p-2.5 text-right">Stale after</th>
                <th className="p-2.5 text-right">Leads</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={s.id} className={cn("border-t border-slate-100", !s.isActive && "text-slate-400")}>
                  <td className="p-2.5">
                    <div className="flex gap-0.5">
                      <button disabled={pending || i === 0} onClick={() => run(() => moveStageAction(s.id, -1))} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button disabled={pending || i === stages.length - 1} onClick={() => run(() => moveStageAction(s.id, 1))} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <button onClick={() => setEditStage(s)} className="text-left">
                      <Chip style={chipStyle(s.color, !s.isActive)}>{s.label}</Chip>
                    </button>
                    {!s.isActive && <span className="ml-1 text-xs">(inactive)</span>}
                  </td>
                  <td className="p-2.5">{CATEGORY_LABEL[s.category]}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {s.isInitial && <Chip className="bg-sky-50 text-sky-700 ring-sky-200">Start</Chip>}
                      {s.requiresQualification && <Chip className="bg-violet-50 text-violet-700 ring-violet-200">Needs qualification</Chip>}
                      {s.askReviveDate && <Chip className="bg-amber-50 text-amber-800 ring-amber-200">Revive date</Chip>}
                      {s.requiresNote && <Chip>Note required</Chip>}
                      {s.probability != null && <Chip>{s.probability}%</Chip>}
                    </div>
                  </td>
                  <td className="p-2.5 text-right">{s.staleDays ? `${s.staleDays} d` : "—"}</td>
                  <td className="p-2.5 text-right tabular-nums">{s.usedBy}</td>
                  <td className="p-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditStage(s)} className="btn-ghost px-2 py-1" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => setMerging(s)} disabled={!s.usedBy} className="btn-ghost px-2 py-1 disabled:opacity-30" title="Merge leads into another stage">
                        <GitMerge className="size-3.5" />
                      </button>
                      <button
                        disabled={pending || s.usedBy > 0}
                        onClick={() => window.confirm(`Delete "${s.label}"?`) && run(() => deleteStageAction(s.id))}
                        className="btn-ghost px-2 py-1 text-rose-600 disabled:opacity-30"
                        title={s.usedBy ? "Has leads — merge them first" : "Delete"}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            Rules: one starting stage, at least one Won and one Lost stage, unique headings. A stage holding leads can&apos;t be deactivated or deleted — merge its leads into another stage first. Old timeline entries keep the heading they had at the time.
          </p>
        </Card>
      </div>

      {editPipeline && <PipelineModal pipeline={editPipeline === "new" ? null : editPipeline} products={products} onClose={() => setEditPipeline(null)} />}
      {editStage && <StageModal pipelineId={selectedId} stage={editStage === "new" ? null : editStage} onClose={() => setEditStage(null)} />}
      {merging && (
        <MergeModal
          row={{ name: merging.label, usedBy: merging.usedBy }}
          targets={stages.filter((s) => s.isActive && s.id !== merging.id && s.category === merging.category).map((s) => ({ id: s.id, name: s.label }))}
          onClose={() => setMerging(null)}
          onMerge={(toId) => run(() => mergeStageAction(merging.id, toId), () => setMerging(null))}
          pending={pending}
        />
      )}
    </div>
  );
}

function PipelineModal({ pipeline, products, onClose }: { pipeline: PipelineRow | null; products: { id: string; name: string }[]; onClose: () => void }) {
  const { pending, run } = useServerAction();
  const [name, setName] = useState(pipeline?.name ?? "");
  const [description, setDescription] = useState(pipeline?.description ?? "");
  const [isActive, setIsActive] = useState(pipeline?.isActive ?? true);
  const [auto, setAuto] = useState<string[]>(pipeline?.autoProductIds ?? []);
  return (
    <Modal open onClose={onClose} title={pipeline ? `Edit ${pipeline.name}` : "New pipeline"}>
      <div className="space-y-4 text-sm">
        <label className="block">
          <span className="label">Name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="label">Description</span>
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div>
          <span className="label">Auto-select for leads with these products</span>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAuto((a) => (a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id]))}
                className={cn("rounded-full border px-2.5 py-1 text-xs", auto.includes(p.id) ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600")}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        {pipeline && !pipeline.isDefault && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        )}
        {!pipeline && <p className="text-xs text-slate-500">Starts with New enquiry → Won / Lost. Add your stages after saving.</p>}
        <button className="btn w-full" disabled={pending || !name.trim()} onClick={() => run(() => savePipelineAction(pipeline?.id ?? null, { name, description, isActive, autoProductIds: auto }), onClose)}>
          Save
        </button>
      </div>
    </Modal>
  );
}

function StageModal({ pipelineId, stage, onClose }: { pipelineId: string; stage: StageRow | null; onClose: () => void }) {
  const { pending, run } = useServerAction();
  const [f, setF] = useState({
    label: stage?.label ?? "",
    category: stage?.category ?? ("OPEN" as StageCategory),
    color: stage?.color ?? PALETTE[1],
    isInitial: stage?.isInitial ?? false,
    isActive: stage?.isActive ?? true,
    requiresQualification: stage?.requiresQualification ?? false,
    askReviveDate: stage?.askReviveDate ?? false,
    requiresNote: stage?.requiresNote ?? false,
    staleDays: stage?.staleDays?.toString() ?? "",
    staleTaskType: stage?.staleTaskType ?? "FOLLOW_UP",
    probability: stage?.probability?.toString() ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const open = f.category === "OPEN";

  function save() {
    run(
      () =>
        saveStageAction(pipelineId, stage?.id ?? null, {
          ...f,
          staleDays: open && f.staleDays ? Number(f.staleDays) : null,
          staleTaskType: open && f.staleDays ? (f.staleTaskType as "FOLLOW_UP" | "QUOTATION_FOLLOW_UP") : null,
          probability: f.probability ? Number(f.probability) : null,
        }),
      onClose,
    );
  }

  return (
    <Modal open onClose={onClose} title={stage ? `Edit "${stage.label}"` : "New stage"}>
      <div className="space-y-4 text-sm">
        <label className="block">
          <span className="label">Heading (shown everywhere)</span>
          <input className="field" value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. 6a. Revised Quotation Sent" autoFocus />
        </label>
        <div>
          <span className="label">Type</span>
          <div className="grid grid-cols-3 gap-2">
            {(["OPEN", "WON", "LOST"] as const).map((c) => (
              <button
                key={c}
                type="button"
                disabled={!!stage?.usedBy && stage.category !== c}
                onClick={() => set("category", c)}
                className={cn("rounded-md border px-3 py-2 disabled:opacity-40", f.category === c ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-700")}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          {!!stage?.usedBy && <p className="mt-1 text-xs text-slate-500">Has leads, so the type is fixed (it would close or reopen them).</p>}
        </div>
        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => set("color", c)} className={cn("size-7 rounded-full ring-offset-2", f.color === c && "ring-2 ring-ink")} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {open && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.isInitial} onChange={(e) => set("isInitial", e.target.checked)} /> New leads start here
            </label>
          )}
          {open && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.requiresQualification} onChange={(e) => set("requiresQualification", e.target.checked)} /> Needs qualification
            </label>
          )}
          {f.category === "LOST" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.askReviveDate} onChange={(e) => set("askReviveDate", e.target.checked)} /> Ask for a revive date
            </label>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.requiresNote} onChange={(e) => set("requiresNote", e.target.checked)} /> Note required
          </label>
          {stage && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
            </label>
          )}
        </div>
        {open && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Nudge after (days idle)</span>
              <input className="field" inputMode="numeric" value={f.staleDays} onChange={(e) => set("staleDays", e.target.value.replace(/\D/g, ""))} placeholder="off" />
            </label>
            <label className="block">
              <span className="label">Nudge task</span>
              <select className="field" value={f.staleTaskType} onChange={(e) => set("staleTaskType", e.target.value)}>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="QUOTATION_FOLLOW_UP">Quotation follow-up</option>
              </select>
            </label>
          </div>
        )}
        <label className="block">
          <span className="label">Win probability % (optional, for pipeline value)</span>
          <input className="field w-28" inputMode="numeric" value={f.probability} onChange={(e) => set("probability", e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </label>
        <button className="btn w-full" disabled={pending || !f.label.trim()} onClick={save}>
          {pending ? "Saving…" : "Save stage"}
        </button>
      </div>
    </Modal>
  );
}
