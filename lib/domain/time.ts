// IST helpers and working-hours maths (spec §8.5). Servers run in UTC; never use local time.
import { TZDate } from "@date-fns/tz";
import { format, formatDistanceStrict } from "date-fns";

export const IST = "Asia/Kolkata";

export interface WorkingHours {
  tz: string;
  days: number[]; // 0 = Sunday
  open: string; // "10:00"
  close: string; // "19:30"
}

const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return { h, m };
};

/** The instant for a wall-clock time on the same calendar day (in tz) as `date`. */
export function wallTime(date: Date, hhmm: string, tz = IST, dayOffset = 0): Date {
  const z = new TZDate(date.getTime(), tz);
  const { h, m } = hm(hhmm);
  return new Date(new TZDate(z.getFullYear(), z.getMonth(), z.getDate() + dayOffset, h, m, 0, 0, tz).getTime());
}

export function isWithinWorkingHours(date: Date, wh: WorkingHours): boolean {
  const z = new TZDate(date.getTime(), wh.tz);
  if (!wh.days.includes(z.getDay())) return false;
  const t = date.getTime();
  return t >= wallTime(date, wh.open, wh.tz).getTime() && t < wallTime(date, wh.close, wh.tz).getTime();
}

/** `date` itself if within working hours, else the next opening time. */
export function nextOpening(date: Date, wh: WorkingHours): Date {
  if (isWithinWorkingHours(date, wh)) return date;
  for (let offset = 0; offset < 8; offset++) {
    const open = wallTime(date, wh.open, wh.tz, offset);
    const z = new TZDate(open.getTime(), wh.tz);
    if (wh.days.includes(z.getDay()) && open.getTime() > date.getTime()) return open;
  }
  throw new Error("No working days configured");
}

export function addWorkingMinutes(start: Date, minutes: number, wh: WorkingHours): Date {
  let cursor = nextOpening(start, wh);
  let left = minutes;
  for (let guard = 0; guard < 400; guard++) {
    const close = wallTime(cursor, wh.close, wh.tz);
    const available = (close.getTime() - cursor.getTime()) / 60000;
    if (left <= available) return new Date(cursor.getTime() + left * 60000);
    left -= available;
    cursor = nextOpening(close, wh);
  }
  throw new Error("addWorkingMinutes did not converge");
}

/** Working minutes elapsed between two instants (0 if b <= a). */
export function workingMinutesBetween(a: Date, b: Date, wh: WorkingHours): number {
  if (b.getTime() <= a.getTime()) return 0;
  let total = 0;
  let cursor = nextOpening(a, wh);
  for (let guard = 0; guard < 400 && cursor.getTime() < b.getTime(); guard++) {
    const close = wallTime(cursor, wh.close, wh.tz);
    const end = Math.min(close.getTime(), b.getTime());
    total += (end - cursor.getTime()) / 60000;
    cursor = nextOpening(close, wh);
  }
  return Math.round(total);
}

/** "2026-10-28" in IST — used in dedupe keys and grouping. */
export function istDateKey(date: Date): string {
  return format(new TZDate(date.getTime(), IST), "yyyy-MM-dd");
}

/** Start of the IST calendar day (as a UTC instant). */
export function startOfIstDay(date: Date, dayOffset = 0): Date {
  return wallTime(date, "00:00", IST, dayOffset);
}

/** "28 Oct, 6:30 PM" */
export function formatIST(date: Date | string | null | undefined, pattern = "d MMM, h:mm a"): string {
  if (!date) return "—";
  return format(new TZDate(new Date(date).getTime(), IST), pattern);
}

export function formatISTDate(date: Date | string | null | undefined): string {
  return formatIST(date, "d MMM yyyy");
}

/** "in 2 h", "3 days ago" */
export function relativeTime(date: Date | string, now = new Date()): string {
  const d = new Date(date);
  const diff = d.getTime() - now.getTime();
  if (Math.abs(diff) < 60_000) return "just now";
  const text = formatDistanceStrict(d, now, { roundingMethod: "floor" })
    .replace(/ hours?/, " h")
    .replace(/ minutes?/, " min")
    .replace(/ seconds?/, " s");
  return diff > 0 ? `in ${text}` : `${text} ago`;
}

/** "Today 6:30 PM" / "Tomorrow 11:00 AM" / "28 Oct, 6:30 PM" */
export function friendlyIST(date: Date | string, now = new Date()): string {
  const d = new Date(date);
  const key = istDateKey(d);
  if (key === istDateKey(now)) return `Today ${formatIST(d, "h:mm a")}`;
  if (key === istDateKey(startOfIstDay(now, 1))) return `Tomorrow ${formatIST(d, "h:mm a")}`;
  if (key === istDateKey(startOfIstDay(now, -1))) return `Yesterday ${formatIST(d, "h:mm a")}`;
  return formatIST(d);
}
