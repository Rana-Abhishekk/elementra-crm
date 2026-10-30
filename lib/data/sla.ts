import type { WorkingHours } from "@/lib/domain/time";
import { workingMinutesBetween } from "@/lib/domain/time";

/** On the starting stage, never contacted, and assigned longer ago than the first-contact SLA (working minutes). */
export function isSlaBreached(
  lead: { stage: { isInitial: boolean }; firstContactedAt: Date | null; assignedAt: Date | null },
  slaMins: number,
  wh: WorkingHours,
  now = new Date(),
) {
  return lead.stage.isInitial && !lead.firstContactedAt && !!lead.assignedAt && workingMinutesBetween(lead.assignedAt, now, wh) > slaMins;
}
