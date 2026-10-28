"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Inbox, MessageCircle, Phone, RotateCcw, Users } from "lucide-react";
import type { LeadListItem } from "@/lib/data/leads";
import { EmptyState, Chip } from "@/components/ui";
import { FollowUpBadge, PriorityChip, SourceBadge, StageBadge } from "@/components/lead-badges";
import { PRODUCT_LABEL } from "@/lib/domain/labels";
import { formatLakh } from "@/lib/domain/money";
import { formatPhone, waLink } from "@/lib/domain/phone";
import { relativeTime, wallTime } from "@/lib/domain/time";
import { shortBranch } from "@/lib/domain/routing/decide";
import { bulkFollowUpAction, bulkReassignAction } from "./actions";

type Row = LeadListItem & { open: boolean; slaBreached: boolean };

const area = (l: Row) => l.locality?.name ?? (l.siteAddressRaw && l.siteAddressRaw.length > 28 ? `${l.siteAddressRaw.slice(0, 28)}…` : l.siteAddressRaw) ?? "—";
const branchName = (l: Row) => (l.branch ? (l.branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(l.branch.name)) : l.locationStatus === "OUT_OF_AREA" ? "Out of area" : "—");

export function LeadTable({
  rows,
  canBulkReassign,
  people,
  emptyHint,
}: {
  rows: Row[];
  canBulkReassign: boolean;
  people: { id: string; name: string; branch: string; onLeave: boolean }[];
  emptyHint: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [owner, setOwner] = useState("");
  const [pending, start] = useTransition();
  const now = new Date();

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function bulk(kind: "reassign" | "followup") {
    const ids = [...selected];
    start(async () => {
      const res = kind === "reassign" ? await bulkReassignAction(ids, owner) : await bulkFollowUpAction(ids, wallTime(new Date(), "11:00", "Asia/Kolkata", 1).toISOString());
      if (res.ok) {
        toast.success(res.message);
        setSelected(new Set());
        router.refresh();
      } else toast.error(res.error);
    });
  }

  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState icon={Inbox} title="No leads here">
          {emptyHint}
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white shadow">
          <span className="font-medium">{selected.size} selected</span>
          {canBulkReassign && (
            <>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-md border-0 bg-white/10 px-2 py-1 text-white">
                <option value="" className="text-ink">Reassign to…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id} className="text-ink">
                    {p.name} · {p.branch}
                    {p.onLeave ? " (on leave)" : ""}
                  </option>
                ))}
              </select>
              <button disabled={!owner || pending} onClick={() => bulk("reassign")} className="btn-gold px-3 py-1">
                <Users className="size-4" /> Reassign
              </button>
            </>
          )}
          <button disabled={pending} onClick={() => bulk("followup")} className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20">
            Follow up tomorrow 11 AM
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto inline-flex items-center gap-1 text-white/70 hover:text-white">
            <RotateCcw className="size-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="w-8 p-3">
                <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Select all" />
              </th>
              <th className="p-3">Lead</th>
              <th className="p-3">Area</th>
              <th className="p-3">Branch · Owner</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Products</th>
              <th className="p-3">Next follow-up</th>
              <th className="p-3 text-right">Value</th>
              <th className="p-3 text-right">Age</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.refCode}`} />
                </td>
                <td className="p-3">
                  <Link href={`/dashboard/leads/${l.id}`} className="font-medium text-ink hover:underline">
                    {l.firstName} {l.lastName}
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <SourceBadge source={l.source} />
                    {l.refCode}
                    {l.phoneE164 && <span>· {formatPhone(l.phoneE164)}</span>}
                    {l.isReturning && <Chip className="bg-sky-50 text-sky-700 ring-sky-200">Returning</Chip>}
                  </div>
                </td>
                <td className="p-3 text-slate-600">{area(l)}</td>
                <td className="p-3">
                  <div>{branchName(l)}</div>
                  <div className="text-xs text-slate-500">{l.owner?.name ?? "Unassigned"}</div>
                </td>
                <td className="p-3">
                  <StageBadge stage={l.stage} lostReason={l.lostReason} />
                  {l.priority === "HOT" && <span className="ml-1"><PriorityChip priority="HOT" /></span>}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {l.products.map((p) => (
                      <Chip key={p}>{PRODUCT_LABEL[p]}</Chip>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <FollowUpBadge at={l.nextFollowUpAt} open={l.open} slaBreached={l.slaBreached} now={now} />
                </td>
                <td className="p-3 text-right whitespace-nowrap">{formatLakh(l.orderValueInr ?? l.estimatedValueInr)}</td>
                <td className="p-3 text-right text-xs whitespace-nowrap text-slate-500">{relativeTime(l.createdAt, now).replace(" ago", "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((l) => (
          <div key={l.id} className="card p-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.refCode}`} />
              <Link href={`/dashboard/leads/${l.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SourceBadge source={l.source} />
                  <span className="truncate font-medium text-ink">
                    {l.firstName} {l.lastName}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">{l.refCode}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {area(l)} · {branchName(l)} · {l.owner?.name ?? "Unassigned"}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StageBadge stage={l.stage} lostReason={l.lostReason} />
                  <FollowUpBadge at={l.nextFollowUpAt} open={l.open} slaBreached={l.slaBreached} now={now} />
                </div>
              </Link>
            </div>
            {l.phoneE164 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`tel:${l.phoneE164}`} className="btn-secondary py-2.5">
                  <Phone className="size-4" /> Call
                </a>
                <a href={waLink(l.phoneE164, `Hi ${l.firstName}, this is Elementra.`)} target="_blank" rel="noreferrer" className="btn-secondary py-2.5 text-emerald-700">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
