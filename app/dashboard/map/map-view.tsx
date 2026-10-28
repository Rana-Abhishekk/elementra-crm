"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Route } from "lucide-react";
import { PIN_COLOR, type MapBranch, type MapPin } from "@/components/map/types";
import { Card, CardHeader, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { dryRunRouting, type PlaygroundResult } from "./actions";

// Leaflet touches `window`, so it only renders on the client
const LeadMap = dynamic(() => import("@/components/map/lead-map"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading map…</div> });

const GROUPS: [MapPin["group"], string][] = [
  ["open", "Open"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["ooa", "Out of area"],
];

export function MapView({ branches, pins }: { branches: MapBranch[]; pins: (MapPin & { branchCode: string | null })[] }) {
  const [branch, setBranch] = useState("");
  const [groups, setGroups] = useState<Set<MapPin["group"]>>(new Set(["open", "won", "ooa"]));
  const [text, setText] = useState("");
  const [res, setRes] = useState<PlaygroundResult | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => pins.filter((p) => groups.has(p.group) && (!branch || p.branchCode === branch)), [pins, groups, branch]);
  const center: [number, number] = branch === "PUN" ? [18.53, 73.85] : [19.07, 72.9];

  function run(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await dryRunRouting(text);
      if (r.ok) setRes(r.result);
      else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="field w-auto py-1.5" aria-label="Branch">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
          {GROUPS.map(([g, label]) => (
            <button
              key={g}
              onClick={() => setGroups((s) => {
                const n = new Set(s);
                if (n.has(g)) n.delete(g);
                else n.add(g);
                return n;
              })}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", groups.has(g) ? "border-slate-300 bg-white text-ink" : "border-transparent bg-slate-100 text-slate-400")}
            >
              <span className="size-2.5 rounded-full" style={{ background: PIN_COLOR[g] }} /> {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">{shown.length} pins</span>
        </div>
        <div className="card h-[60vh] min-h-80 overflow-hidden p-0">
          <LeadMap branches={branches} pins={shown} center={center} probe={res?.lat != null && res.lng != null ? { lat: res.lat, lng: res.lng, label: res.label ?? res.input } : null} />
        </div>
        <p className="text-xs text-slate-500">Dashed circles are each Experience Centre&apos;s service radius. Pins sit on locality centroids, not exact buildings.</p>
      </div>

      <Card className="self-start">
        <CardHeader title={<span className="inline-flex items-center gap-1.5"><Route className="size-4 text-gold" /> Routing playground</span>} />
        <div className="space-y-3 p-4">
          <form onSubmit={run} className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} className="field" placeholder='Try "kandiwali east" or "Kalyan West"' aria-label="Address or pincode" />
            <button className="btn shrink-0" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Check"}
            </button>
          </form>
          <p className="text-xs text-slate-500">Type any address or pincode — see where it would go and who would get it. Nothing is saved.</p>
          {res && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Understood as</div>
                <div className="font-medium text-ink">{res.label ?? "— (no match)"}</div>
                <div className="text-xs text-slate-500">
                  {res.method}
                  {res.confidence != null ? ` · ${Math.round(res.confidence * 100)}%` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip className="bg-gold-light text-brand ring-gold/40">{res.rule}</Chip>
                {res.branch && <span className="font-medium">→ {res.branch}</span>}
                {res.nextRep && <span className="text-slate-600">· next: {res.nextRep}</span>}
              </div>
              {res.candidates.length > 0 && (
                <table className="w-full text-xs">
                  <tbody>
                    {res.candidates.map((c) => (
                      <tr key={c.code} className="border-t border-slate-100">
                        <td className="py-1">{c.name}</td>
                        <td className={cn("py-1 text-right", c.inRadius ? "text-emerald-700" : "text-slate-400")}>{c.distanceKm.toFixed(1)} km</td>
                        <td className="py-1 text-right text-slate-500">radius {c.radiusKm} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
                {res.explanation.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
