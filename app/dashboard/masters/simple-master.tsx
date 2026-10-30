"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GitMerge, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Card, Chip, EmptyState } from "@/components/ui";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { deleteMasterAction, mergeMasterAction, moveMasterAction, saveProductAction, saveSourceAction, setMasterActiveAction } from "./actions";

export interface MasterRow {
  id: string;
  name: string;
  isActive: boolean;
  usedBy: number;
  keys: string[];
  color?: string;
  isPaid?: boolean;
  isFallback?: boolean;
}

const COLORS = ["#C026D3", "#DB2777", "#2563EB", "#0891B2", "#16A34A", "#CA8A04", "#EA580C", "#7C3AED", "#0D9488", "#475569", "#E11D48", "#94A3B8"];

/**
 * The shared master pattern (06 §4.1): search, show inactive, Used by N, order arrows, Active toggle,
 * Edit · Merge into… · Delete (only when unused). Used by Sources and Products.
 */
export function SimpleMaster({ kind, rows, keyHint }: { kind: "source" | "product"; rows: MasterRow[]; keyHint: string }) {
  const { pending, run } = useServerAction();
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<MasterRow | "new" | null>(null);
  const [merging, setMerging] = useState<MasterRow | null>(null);
  const noun = kind === "source" ? "source" : "product";
  const list = useMemo(() => rows.filter((r) => (showInactive || r.isActive) && r.name.toLowerCase().includes(q.trim().toLowerCase())), [rows, q, showInactive]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${noun}s…`} className="field max-w-xs py-1.5" />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive ({rows.filter((r) => !r.isActive).length})
        </label>
        <button className="btn ml-auto py-1.5" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add {noun}
        </button>
      </div>
      <Card className="overflow-x-auto">
        {list.length === 0 ? (
          <EmptyState title={`No ${noun}s match`} />
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="w-16 p-3">Order</th>
                <th className="p-3">Name</th>
                <th className="p-3">{kind === "source" ? "Integration keys" : "Meta answer keys"}</th>
                <th className="p-3 text-right">Used by</th>
                <th className="p-3">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const idx = rows.findIndex((x) => x.id === r.id);
                return (
                  <tr key={r.id} className={cn("border-t border-slate-100", !r.isActive && "text-slate-400")}>
                    <td className="p-3">
                      <div className="flex gap-0.5">
                        <button disabled={pending || idx === 0} onClick={() => run(() => moveMasterAction(kind, r.id, -1))} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button disabled={pending || idx === rows.length - 1} onClick={() => run(() => moveMasterAction(kind, r.id, 1))} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        {r.color && <span className="size-3 rounded-full" style={{ backgroundColor: r.color }} />}
                        {r.name}
                      </span>
                      <span className="ml-2 inline-flex gap-1">
                        {r.isPaid && <Chip className="bg-amber-50 text-amber-800 ring-amber-200">Paid</Chip>}
                        {r.isFallback && <Chip className="bg-slate-100 text-slate-600 ring-slate-200">Fallback</Chip>}
                        {!r.isActive && <Chip className="bg-slate-50 text-slate-400 ring-slate-200">Inactive</Chip>}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {r.keys.length ? r.keys.map((k) => <code key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{k}</code>) : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.usedBy}</td>
                    <td className="p-3">
                      <button
                        disabled={pending}
                        onClick={() => run(() => setMasterActiveAction(kind, r.id, !r.isActive))}
                        className={cn("relative h-5 w-9 rounded-full transition", r.isActive ? "bg-emerald-500" : "bg-slate-300")}
                        aria-label={r.isActive ? "Deactivate" : "Activate"}
                        title={r.isActive ? "Deactivate (hidden from dropdowns; old leads keep it)" : "Activate"}
                      >
                        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition", r.isActive ? "left-4.5" : "left-0.5")} />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(r)} className="btn-ghost px-2 py-1" title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => setMerging(r)} disabled={r.isFallback} className="btn-ghost px-2 py-1 disabled:opacity-30" title="Merge into…">
                          <GitMerge className="size-3.5" />
                        </button>
                        <button
                          disabled={pending || r.usedBy > 0 || r.isFallback}
                          onClick={() => window.confirm(`Delete "${r.name}"?`) && run(() => deleteMasterAction(kind, r.id))}
                          className="btn-ghost px-2 py-1 text-rose-600 disabled:opacity-30"
                          title={r.usedBy > 0 ? "In use — deactivate or merge instead" : "Delete"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      {editing && <EditModal kind={kind} row={editing === "new" ? null : editing} keyHint={keyHint} onClose={() => setEditing(null)} />}
      {merging && (
        <MergeModal
          row={merging}
          targets={rows.filter((r) => r.isActive && r.id !== merging.id)}
          onClose={() => setMerging(null)}
          onMerge={(toId) => run(() => mergeMasterAction(kind, merging.id, toId), () => setMerging(null))}
          pending={pending}
        />
      )}
    </>
  );
}

function EditModal({ kind, row, keyHint, onClose }: { kind: "source" | "product"; row: MasterRow | null; keyHint: string; onClose: () => void }) {
  const { pending, run } = useServerAction();
  const [name, setName] = useState(row?.name ?? "");
  const [color, setColor] = useState(row?.color ?? COLORS[0]);
  const [isPaid, setIsPaid] = useState(row?.isPaid ?? false);
  const [keys, setKeys] = useState((row?.keys ?? []).join("\n"));
  const keyList = keys.split(/[\n,]/).map((k) => k.trim()).filter(Boolean);

  function save() {
    run(
      () => (kind === "source" ? saveSourceAction(row?.id ?? null, { name, color, isPaid, integrationKeys: keyList }) : saveProductAction(row?.id ?? null, { name, metaAnswerKeys: keyList })),
      onClose,
    );
  }

  return (
    <Modal open onClose={onClose} title={row ? `Edit ${row.name}` : `New ${kind}`}>
      <div className="space-y-4 text-sm">
        <label className="block">
          <span className="label">Name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        {kind === "source" && (
          <>
            <div>
              <span className="label">Colour</span>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={cn("size-7 rounded-full ring-offset-2", color === c && "ring-2 ring-ink")} style={{ backgroundColor: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} /> Paid source (ads)
            </label>
          </>
        )}
        <label className="block">
          <span className="label">{kind === "source" ? "Integration keys" : "Meta answer keys"} (one per line)</span>
          <textarea className="field font-mono text-xs" rows={4} value={keys} onChange={(e) => setKeys(e.target.value)} />
          <span className="mt-1 block text-xs text-slate-500">{keyHint}</span>
        </label>
        <button className="btn w-full" disabled={pending || !name.trim()} onClick={save}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

export function MergeModal({ row, targets, onClose, onMerge, pending }: { row: { name: string; usedBy: number }; targets: { id: string; name: string }[]; onClose: () => void; onMerge: (toId: string) => void; pending: boolean }) {
  const [to, setTo] = useState(targets[0]?.id ?? "");
  return (
    <Modal open onClose={onClose} title={`Merge "${row.name}" into…`}>
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          All {row.usedBy} record(s) using <strong>{row.name}</strong> move to the value you pick. &ldquo;{row.name}&rdquo; is then deactivated (kept for history, hidden from dropdowns).
        </p>
        <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button className="btn w-full" disabled={pending || !to} onClick={() => onMerge(to)}>
          Merge and deactivate
        </button>
      </div>
    </Modal>
  );
}
