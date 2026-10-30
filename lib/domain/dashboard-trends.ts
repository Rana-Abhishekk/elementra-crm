// Pure helpers behind the dashboard's trends. Metric definitions stay in spec §14.
import { formatIST, startOfIstDay } from "@/lib/domain/time";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** % change against the previous period; null when there is nothing to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Won ÷ (won + lost), "n/a" (null) below the spec's minimum of 5 closed leads. */
export function conversionPct(won: number, lost: number): number | null {
  return won + lost >= 5 ? Math.round((won / (won + lost)) * 100) : null;
}

/** Leads at each stage or further along. Always narrows, so it can be drawn as a true funnel. */
export function reachedCounts(counts: number[]): number[] {
  let running = 0;
  return [...counts].reverse().map((c) => (running += c)).reverse();
}

/** Run-rate forecast: the average monthly won value over the given window. */
export function monthlyRunRate(wonValue: number, months = 3): number {
  return Math.round(wonValue / months);
}

/** Splits items into consecutive 7-day buckets ending today (IST), oldest first. */
export function weeklyGroups<T>(items: T[], at: (item: T) => Date, now: Date, weeks: number) {
  const start = startOfIstDay(now, 1 - weeks * 7);
  const groups = Array.from({ length: weeks }, (_, i) => ({
    label: formatIST(new Date(start.getTime() + i * WEEK_MS), "d MMM"),
    items: [] as T[],
  }));
  for (const item of items) {
    const i = Math.floor((at(item).getTime() - start.getTime()) / WEEK_MS);
    if (i >= 0 && i < weeks) groups[i].items.push(item);
  }
  return groups;
}

/** IST calendar months around `now`: `back` before it, then the current one, then `forward` after. */
export function monthKeys(now: Date, back: number, forward = 0) {
  const [year, month] = formatIST(now, "yyyy-MM").split("-").map(Number);
  return Array.from({ length: back + forward + 1 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - back + i, 15));
    return { key: formatIST(d, "yyyy-MM"), label: formatIST(d, "MMM yyyy") };
  });
}
