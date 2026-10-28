import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/domain/settings";
import { evaluateRules, type Intent, type SnapLead, type Snapshot } from "./rules";

// Wed 28 Oct 2026, 15:00 IST
const NOW = new Date("2026-10-28T15:00:00+05:30");
const h = (n: number) => new Date(NOW.getTime() - n * 3600_000);
const d = (n: number) => new Date(NOW.getTime() - n * 86400_000);

const users = [
  { id: "owner", name: "Aarav Mehta", role: "OWNER", branchId: null },
  { id: "kabir", name: "Kabir Malhotra", role: "SALES_MANAGER", branchId: "WOR" },
  { id: "ishita", name: "Ishita Desai", role: "SALES_REP", branchId: "WOR" },
  { id: "ananya", name: "Ananya Rao", role: "PRESALES", branchId: "ONL" },
];

const lead = (o: Partial<SnapLead> = {}): SnapLead => ({
  id: "L1",
  refCode: "EL-1042",
  firstName: "Rhea",
  lastName: "Kapoor",
  salutation: null,
  stage: "NEW",
  lostReason: null,
  reviveAt: null,
  ownerId: "ishita",
  branchId: "WOR",
  locationStatus: "RESOLVED",
  assignedAt: h(0.5),
  createdAt: h(0.5),
  lastActivityAt: h(0.5),
  firstContactedAt: null,
  contacted: false,
  calls: [],
  openTasks: [{ id: "t", type: "FIRST_CALL", dueAt: h(-0.5) }],
  ...o,
});

const snap = (o: Partial<Snapshot> = {}): Snapshot => ({
  leads: [],
  dueFollowUps: [],
  appointments: [],
  users,
  yesterday: { newLeads: 14, outOfArea: 2, needsLocation: 3 },
  overdueByUser: { ishita: 5 },
  ...o,
});

const settings: Settings = { ...DEFAULT_SETTINGS, reminders: { ...DEFAULT_SETTINGS.reminders, disabledRules: ["R9"] } };
const run = (s: Snapshot, now = NOW, st = settings) => evaluateRules(s, st, now);
const rules = (xs: Intent[]) => xs.map((x) => `${x.rule}:${x.kind}`);

/** Idempotency: what the engine would persist on a second run is nothing new (same dedupe keys). */
function keysAreStable(s: Snapshot) {
  const a = run(s).map((i) => `${i.kind}:${i.dedupeKey}`);
  const b = run(s, new Date(NOW.getTime() + 30_000)).map((i) => `${i.kind}:${i.dedupeKey}`);
  expect(new Set(b)).toEqual(new Set(a));
  expect(new Set(a).size).toBe(a.length);
}

describe("R1 / R1b first-contact SLA", () => {
  it("does not fire within the SLA", () => {
    expect(run(snap({ leads: [lead()] }))).toEqual([]);
  });

  it("fires R1 once after 60 working minutes", () => {
    const s = snap({ leads: [lead({ assignedAt: h(2) })] });
    const out = run(s);
    expect(rules(out)).toEqual(["R1:notify", "R1:notify", "R1:timeline"]);
    expect(out[0]).toMatchObject({ userId: "ishita", dedupeKey: "R1:L1", title: "SLA breached: EL-1042 not contacted in 1 h" });
    expect(out[1]).toMatchObject({ userId: "owner", dedupeKey: "R1:L1:owner" });
    keysAreStable(s);
  });

  it("escalates to the branch manager after 4 working hours", () => {
    const out = run(snap({ leads: [lead({ assignedAt: h(4.5) })] }));
    expect(out.filter((i) => i.rule === "R1b").map((i) => i.kind)).toEqual(["task", "notify", "timeline"]);
    expect(out.filter((i) => i.rule === "R1" && i.kind === "notify")).toHaveLength(2);
    expect(out.find((i) => i.rule === "R1b" && i.kind === "task")).toMatchObject({ assigneeId: "kabir", type: "ESCALATION" });
  });

  it("counts working minutes only — a night lead isn't breached before opening", () => {
    const night = new Date("2026-10-27T23:40:00+05:30");
    const out = run(snap({ leads: [lead({ assignedAt: night, createdAt: night })] }), new Date("2026-10-28T10:45:00+05:30"));
    expect(out).toEqual([]);
  });

  it("stops once contacted", () => {
    expect(run(snap({ leads: [lead({ assignedAt: h(5), contacted: true })] }))).toEqual([]);
  });
});

describe("R2 follow-up due", () => {
  it("notifies the assignee once per task", () => {
    const s = snap({ dueFollowUps: [{ id: "T9", leadId: "L1", assigneeId: "ishita", type: "FOLLOW_UP", title: "Call Rhea", dueAt: h(1) }] });
    expect(run(s)[0]).toMatchObject({ rule: "R2", dedupeKey: "R2:T9", userId: "ishita" });
    keysAreStable(s);
  });
});

describe("R3 stale stage", () => {
  it("creates a quotation follow-up after 3 idle days in Quotation Sent", () => {
    const s = snap({ leads: [lead({ stage: "QUOTATION_SENT", lastActivityAt: d(4), openTasks: [], contacted: true })] });
    const task = run(s).find((i) => i.kind === "task");
    expect(task).toMatchObject({ rule: "R3", type: "QUOTATION_FOLLOW_UP", dedupeKey: "R3:L1:QUOTATION_SENT:2026-10-28" });
    keysAreStable(s);
  });

  it("stays quiet when a task is already open", () => {
    expect(run(snap({ leads: [lead({ stage: "QUOTATION_SENT", lastActivityAt: d(4), contacted: true })] }))).toEqual([]);
  });
});

describe("R4 / R5 appointments", () => {
  const appt = { id: "A1", leadId: "L1", leadName: "Mr. Shah", leadRef: "EL-1", branchName: "Worli", hostId: "ishita", hostName: "Ishita Desai", hasPhone: true };
  it("sends the reminder and a prep task within 24 h", () => {
    const s = snap({ appointments: [{ ...appt, scheduledAt: new Date(NOW.getTime() + 20 * 3600_000) }] });
    const out = run(s);
    expect(rules(out)).toEqual(["R4:message", "R4:task"]);
    expect(out[0]).toMatchObject({ templateCode: "appointment_reminder", dedupeKey: "R4:A1" });
    keysAreStable(s);
  });

  it("asks for the visit outcome 2 h after the start", () => {
    const out = run(snap({ appointments: [{ ...appt, scheduledAt: h(3) }] }));
    expect(out[0]).toMatchObject({ rule: "R5", type: "VISIT_OUTCOME", title: "Did Mr. Shah visit? Mark visited / no-show" });
  });
});

describe("R6 no-response", () => {
  it("suggests close-the-loop after 3 unanswered calls, never closes", () => {
    const calls = [
      { outcome: "NO_ANSWER" as const, at: d(1) },
      { outcome: "BUSY" as const, at: d(3) },
      { outcome: "SWITCHED_OFF" as const, at: d(6) },
    ];
    const s = snap({ leads: [lead({ stage: "CONTACTED", contacted: true, calls })] });
    const out = run(s);
    expect(rules(out)).toEqual(["R6:notify"]);
    keysAreStable(s);
  });

  it("resets after a connected call", () => {
    const calls = [
      { outcome: "NO_ANSWER" as const, at: d(1) },
      { outcome: "CONNECTED" as const, at: d(2) },
      { outcome: "NO_ANSWER" as const, at: d(3) },
      { outcome: "NO_ANSWER" as const, at: d(4) },
    ];
    expect(run(snap({ leads: [lead({ stage: "CONTACTED", contacted: true, calls })] }))).toEqual([]);
  });
});

describe("R7 revive", () => {
  it("re-engages On hold leads on their revive date, once", () => {
    const s = snap({ leads: [lead({ stage: "CLOSED_LOST", lostReason: "ON_HOLD", reviveAt: d(1), openTasks: [] })] });
    expect(rules(run(s))).toEqual(["R7:task", "R7:notify", "R7:timeline"]);
    keysAreStable(s);
  });

  it("ignores other lost reasons", () => {
    expect(run(snap({ leads: [lead({ stage: "CLOSED_LOST", lostReason: "BUDGET", reviveAt: d(1) })] }))).toEqual([]);
  });
});

describe("R8 needs-location ageing", () => {
  it("alerts the Online Desk after 24 h", () => {
    const s = snap({ leads: [lead({ locationStatus: "NEEDS_LOCATION", ownerId: "ananya", createdAt: d(2), assignedAt: d(2), contacted: true })] });
    expect(run(s).filter((i) => i.rule === "R8")).toHaveLength(1);
    keysAreStable(s);
  });
});

describe("R9 digest", () => {
  const on = DEFAULT_SETTINGS;
  it("waits until 09:30 IST", () => {
    expect(run(snap(), new Date("2026-10-28T09:00:00+05:30"), on)).toEqual([]);
  });

  it("sends one digest per manager/owner per day", () => {
    const out = run(snap(), new Date("2026-10-28T09:45:00+05:30"), on);
    expect(out.map((i) => (i as { userId: string }).userId).sort()).toEqual(["kabir", "owner"]);
    expect(out[0]).toMatchObject({ title: "Morning digest · Yesterday: 14 new, 2 out-of-area, 3 need location", body: "Overdue follow-ups: Ishita 5", dedupeKey: "R9:owner:2026-10-28" });
  });
});

describe("rule switches", () => {
  it("respects disabled rules", () => {
    const off = { ...settings, reminders: { ...settings.reminders, disabledRules: ["R1", "R1b", "R9"] } };
    expect(run(snap({ leads: [lead({ assignedAt: h(6) })] }), NOW, off)).toEqual([]);
  });
});
