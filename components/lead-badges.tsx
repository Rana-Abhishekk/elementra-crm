import type { LeadSource, LeadStage, LostReason, Priority } from "@prisma/client";
import { Chip } from "@/components/ui";
import { PRIORITY_COLOR, PRIORITY_LABEL, SOURCE_LABEL } from "@/lib/domain/labels";
import { STAGE_COLOR, STAGE_SHORT, stageLabel } from "@/lib/domain/stages";
import { istDateKey, relativeTime } from "@/lib/domain/time";
import { cn } from "@/lib/utils";

export function StageBadge({ stage, lostReason, full }: { stage: LeadStage; lostReason?: LostReason | null; full?: boolean }) {
  const label = full ? stageLabel(stage, lostReason) : stage === "CLOSED_LOST" && lostReason ? stageLabel(stage, lostReason).replace("Closed ", "") : STAGE_SHORT[stage];
  return (
    <Chip className={STAGE_COLOR[stage]} title={stageLabel(stage, lostReason)}>
      {label}
    </Chip>
  );
}

export function PriorityChip({ priority }: { priority: Priority }) {
  return <Chip className={PRIORITY_COLOR[priority]}>{PRIORITY_LABEL[priority]}</Chip>;
}

const SOURCE_STYLE: Record<LeadSource, [string, string]> = {
  INSTAGRAM_PAID: ["IG", "bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white"],
  INSTAGRAM_ORGANIC: ["IG", "bg-gradient-to-br from-fuchsia-300 to-orange-200 text-fuchsia-900"],
  FACEBOOK: ["FB", "bg-blue-600 text-white"],
  GOOGLE: ["G", "bg-white text-blue-600 ring-1 ring-slate-200"],
  WHATSAPP: ["WA", "bg-emerald-500 text-white"],
  LINKEDIN: ["in", "bg-sky-700 text-white"],
  REFERENCE: ["Ref", "bg-gold-light text-brand"],
  REPEAT_PURCHASE: ["Rep", "bg-violet-100 text-violet-700"],
  WALK_IN: ["Walk", "bg-slate-200 text-slate-700"],
  CALL: ["Call", "bg-slate-200 text-slate-700"],
  WEBSITE: ["Web", "bg-brand text-white"],
};

export function SourceBadge({ source, withLabel }: { source: LeadSource; withLabel?: boolean }) {
  const [abbr, cls] = SOURCE_STYLE[source];
  return (
    <span className="inline-flex items-center gap-1.5" title={SOURCE_LABEL[source]}>
      <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold", cls)}>{abbr}</span>
      {withLabel && <span className="text-sm">{SOURCE_LABEL[source]}</span>}
    </span>
  );
}

export function FollowUpBadge({ at, open, slaBreached, now = new Date() }: { at: Date | null; open: boolean; slaBreached?: boolean; now?: Date }) {
  if (!open) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {slaBreached && <Chip className="bg-white text-rose-600 ring-rose-300">SLA breached</Chip>}
      {!at ? (
        <Chip className="bg-white text-slate-500 ring-slate-300">No follow-up</Chip>
      ) : at < now ? (
        <Chip className="bg-rose-50 text-rose-700 ring-rose-200">Overdue · {relativeTime(at, now).replace(" ago", "")}</Chip>
      ) : istDateKey(at) === istDateKey(now) ? (
        <Chip className="bg-amber-50 text-amber-800 ring-amber-200">Due today · {relativeTime(at, now)}</Chip>
      ) : (
        <span className="text-xs text-slate-600">{relativeTime(at, now)}</span>
      )}
    </span>
  );
}
