import { FEATURES, STATUS_META, type FeatureStatus } from "@/lib/features";
import { cn } from "@/lib/utils";

/** Status chip from the feature registry. LIVE renders nothing unless `showLive`. */
export function FeatureBadge({
  status,
  feature,
  showLive,
  addon,
  className,
}: {
  status?: FeatureStatus;
  feature?: string;
  showLive?: boolean;
  addon?: boolean;
  className?: string;
}) {
  const f = feature ? FEATURES.find((x) => x.id === feature) : undefined;
  const s = status ?? f?.status ?? "LIVE";
  if (s === "LIVE" && !showLive) return null;
  const meta = STATUS_META[s];
  const isAddon = addon ?? f?.isAddon;
  const tooltip = [meta.tooltip, f?.gaps].filter(Boolean).join(" ");
  return (
    <span
      title={tooltip}
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset", meta.className, className)}
    >
      {meta.badge}
      {isAddon && <span className="opacity-70">· add-on</span>}
    </span>
  );
}
