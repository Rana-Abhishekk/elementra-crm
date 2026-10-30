import type { Priority } from "@prisma/client";
import { Chip } from "@/components/ui";
import { PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/domain/labels";
import { chipStyle, shortLabel } from "@/lib/domain/stages";
import { istDateKey, relativeTime } from "@/lib/domain/time";

type StageLike = { label: string; color: string; isActive?: boolean };
type SourceLike = { name: string; color: string; isActive?: boolean };

/** Stage chip in the stage master's colour; inactive stages show greyed with "(inactive)". */
export function StageBadge({ stage, full }: { stage: StageLike; full?: boolean }) {
  const inactive = stage.isActive === false;
  return (
    <Chip className="" style={chipStyle(stage.color, inactive)} title={stage.label}>
      {full ? stage.label : shortLabel(stage.label)}
      {inactive ? " (inactive)" : ""}
    </Chip>
  );
}

export function PriorityChip({ priority }: { priority: Priority }) {
  return <Chip className={PRIORITY_COLOR[priority]}>{PRIORITY_LABEL[priority]}</Chip>;
}

/** Short initials in the source's colour, e.g. "IG" for Instagram (Paid). */
const initials = (name: string) =>
  name
    .replace(/\(.*?\)/g, "")
    .split(/[\s/–-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "?";

export function SourceBadge({ source, withLabel }: { source: SourceLike; withLabel?: boolean }) {
  const inactive = source.isActive === false;
  const label = `${source.name}${inactive ? " (inactive)" : ""}`;
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span
        className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold text-white"
        style={{ backgroundColor: inactive ? "#94A3B8" : source.color }}
      >
        {initials(source.name)}
      </span>
      {withLabel && <span className={inactive ? "text-sm text-slate-400" : "text-sm"}>{label}</span>}
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
