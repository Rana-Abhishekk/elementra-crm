import { Route, UserX } from "lucide-react";
import type { RoutingRule } from "@prisma/client";
import { RULE_LABEL } from "@/lib/domain/labels";
import { Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface RoutingCardData {
  rule: RoutingRule;
  branchName: string | null;
  ownerName: string | null;
  explanation: string[];
  candidates: { code: string; name: string; distanceKm: number; radiusKm: number; inRadius: boolean }[];
  skipped: { name: string; reason: string }[];
}

const RULE_TONE: Partial<Record<RoutingRule, string>> = {
  PINCODE_RULE: "bg-gold-light text-brand ring-gold/40",
  NEAREST_IN_RADIUS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OUT_OF_AREA: "bg-rose-50 text-rose-700 ring-rose-200",
  NEEDS_LOCATION: "bg-amber-50 text-amber-800 ring-amber-200",
  RETURNING_SAME_OWNER: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function RoutingCard({ data, title, compact }: { data: RoutingCardData; title?: string; compact?: boolean }) {
  const chosen = data.candidates.find((c) => c.name === data.branchName);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <Route className="size-4 text-gold" />
        <h3 className="text-sm font-semibold text-ink">{title ?? `Why this lead went to ${data.branchName ?? "this queue"}`}</h3>
        <Chip className={cn("ml-auto", RULE_TONE[data.rule])}>{RULE_LABEL[data.rule]}</Chip>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <ol className="space-y-1.5">
          {data.explanation.map((line, i) => (
            <li key={i} className="flex gap-2 text-slate-700">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] text-white">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        {data.candidates.length > 0 && !compact && (
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 text-left font-medium">Branch</th>
                <th className="py-1 text-right font-medium">Distance</th>
                <th className="py-1 text-right font-medium">Radius</th>
              </tr>
            </thead>
            <tbody>
              {data.candidates.map((c) => (
                <tr key={c.code} className={cn("border-t border-slate-100", c === chosen && "font-semibold text-ink")}>
                  <td className="py-1">
                    {c.name} {c === chosen && <span className="text-gold">●</span>}
                  </td>
                  <td className={cn("py-1 text-right", c.inRadius ? "text-emerald-700" : "text-slate-400")}>{c.distanceKm.toFixed(1)} km</td>
                  <td className="py-1 text-right text-slate-500">{c.radiusKm} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data.skipped.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <UserX className="size-3.5 text-slate-400" />
            {data.skipped.map((s) => (
              <Chip key={s.name} className="bg-slate-100 text-slate-600 ring-slate-200">
                Skipped {s.name} ({s.reason})
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
