import { describe, expect, it } from "vitest";
import { addWorkingMinutes, formatIST, isWithinWorkingHours, istDateKey, nextOpening, wallTime, workingMinutesBetween, type WorkingHours } from "./time";

const WH: WorkingHours = { tz: "Asia/Kolkata", days: [0, 1, 2, 3, 4, 5, 6], open: "10:00", close: "19:30" };
// 2026-10-28 is a Wednesday. IST = UTC+5:30.
const ist = (s: string) => new Date(`${s}+05:30`);

describe("working hours (IST)", () => {
  it("knows when the showroom is open", () => {
    expect(isWithinWorkingHours(ist("2026-10-28T10:00:00"), WH)).toBe(true);
    expect(isWithinWorkingHours(ist("2026-10-28T19:30:00"), WH)).toBe(false);
    expect(isWithinWorkingHours(ist("2026-10-28T09:59:00"), WH)).toBe(false);
  });

  it("night lead at 23:40 → first call due 11:00 next morning", () => {
    const due = addWorkingMinutes(ist("2026-10-28T23:40:00"), 60, WH);
    expect(due.toISOString()).toBe(ist("2026-10-29T11:00:00").toISOString());
    expect(formatIST(due)).toBe("29 Oct, 11:00 AM");
  });

  it("early-morning lead counts from opening", () => {
    expect(addWorkingMinutes(ist("2026-10-28T07:15:00"), 60, WH).toISOString()).toBe(ist("2026-10-28T11:00:00").toISOString());
  });

  it("carries minutes over closing time", () => {
    expect(addWorkingMinutes(ist("2026-10-28T19:00:00"), 60, WH).toISOString()).toBe(ist("2026-10-29T10:30:00").toISOString());
  });

  it("skips Sunday when it is turned off", () => {
    const noSunday = { ...WH, days: [1, 2, 3, 4, 5, 6] };
    // Saturday 31 Oct 23:40 → Monday 2 Nov 11:00
    expect(addWorkingMinutes(ist("2026-10-31T23:40:00"), 60, noSunday).toISOString()).toBe(ist("2026-11-02T11:00:00").toISOString());
    expect(nextOpening(ist("2026-11-01T12:00:00"), noSunday).toISOString()).toBe(ist("2026-11-02T10:00:00").toISOString());
  });

  it("counts working minutes between instants", () => {
    expect(workingMinutesBetween(ist("2026-10-28T18:30:00"), ist("2026-10-29T10:30:00"), WH)).toBe(90);
    expect(workingMinutesBetween(ist("2026-10-28T22:00:00"), ist("2026-10-28T23:00:00"), WH)).toBe(0);
  });

  it("works regardless of the server time zone (UTC here)", () => {
    // 20:00 UTC = 01:30 IST next day
    expect(istDateKey(new Date("2026-10-28T20:00:00Z"))).toBe("2026-10-29");
    expect(wallTime(new Date("2026-10-28T20:00:00Z"), "10:00").toISOString()).toBe("2026-10-29T04:30:00.000Z");
  });
});
