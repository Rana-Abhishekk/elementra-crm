// Reminder rules R1–R9 (spec §9.2). PURE: given a snapshot + now → intents. The engine persists
// intents idempotently via their dedupeKey, so running twice in the same minute creates nothing new.
import type { CallOutcome, LeadStage, LostReason, TaskType } from "@prisma/client";
import { addWorkingMinutes, formatIST, istDateKey, wallTime, workingMinutesBetween, type WorkingHours } from "@/lib/domain/time";
import type { Settings } from "@/lib/domain/settings";
import { STAGE_LABEL } from "@/lib/domain/stages";

export type RuleCode = "R1" | "R1b" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9";

export const RULES: { code: RuleCode; name: string; describe: (s: Settings) => string }[] = [
  { code: "R1", name: "First-contact SLA", describe: (s) => `If a new lead isn't called or messaged within ${s.sla.firstContactMins} working minutes, alert the owner.` },
  { code: "R1b", name: "SLA escalation", describe: (s) => `Still not contacted after ${s.sla.escalateMins} working minutes (${Math.round(s.sla.escalateMins / 60)} h)? Escalate to the branch manager.` },
  { code: "R2", name: "Follow-up due", describe: () => "When a follow-up comes due, remind the owner. Overdue follow-ups go into the manager's morning digest." },
  { code: "R3", name: "Stale stage", describe: (s) => `No activity for a while in a stage (e.g. ${s.reminders.staleDays.QUOTATION_SENT} days in Quotation Sent) and nothing scheduled? Create a follow-up task.` },
  { code: "R4", name: "Appointment reminder", describe: (s) => `${s.reminders.appointmentHours} h before a showroom visit, WhatsApp the customer a reminder and give the host a prep task.` },
  { code: "R5", name: "Visit outcome", describe: () => "Two hours after a visit's start time, ask the host: did they visit, or was it a no-show?" },
  { code: "R6", name: "No-response suggestion", describe: (s) => `After ${s.reminders.noResponseCalls} unanswered calls in 10 days, suggest the polite close-the-loop message. Never auto-closes.` },
  { code: "R7", name: "Revive on-hold leads", describe: () => "When an On hold / Timeline lead's revive date arrives, give the last owner a task to re-engage." },
  { code: "R8", name: "Needs-location ageing", describe: () => "A lead still without a location after 24 h? Alert the Online Desk lead and the owner." },
  { code: "R9", name: "Manager daily digest", describe: (s) => `Every morning after ${s.reminders.digestTime} IST: yesterday's new leads, out-of-area count and overdue follow-ups by person.` },
];

// ---------- snapshot ----------

export interface SnapLead {
  id: string;
  refCode: string;
  firstName: string;
  lastName: string | null;
  salutation: string | null;
  stage: LeadStage;
  lostReason: LostReason | null;
  reviveAt: Date | null;
  ownerId: string | null;
  branchId: string | null;
  locationStatus: "RESOLVED" | "NEEDS_LOCATION" | "OUT_OF_AREA";
  assignedAt: Date | null;
  createdAt: Date;
  lastActivityAt: Date;
  firstContactedAt: Date | null;
  /** CALL or manual WHATSAPP/MESSAGE_SENT exists */
  contacted: boolean;
  /** recent calls, newest first */
  calls: { outcome: CallOutcome | null; at: Date }[];
  openTasks: { id: string; type: TaskType; dueAt: Date }[];
}

export interface SnapTask {
  id: string;
  leadId: string | null;
  assigneeId: string;
  type: TaskType;
  title: string;
  dueAt: Date;
}

export interface SnapAppointment {
  id: string;
  leadId: string;
  leadName: string;
  leadRef: string;
  branchName: string;
  hostId: string | null;
  hostName: string | null;
  scheduledAt: Date;
  hasPhone: boolean;
}

export interface SnapUser {
  id: string;
  name: string;
  role: string;
  branchId: string | null;
}

export interface Snapshot {
  leads: SnapLead[];
  dueFollowUps: SnapTask[];
  appointments: SnapAppointment[];
  users: SnapUser[];
  /** for R9 */
  yesterday: { newLeads: number; outOfArea: number; needsLocation: number };
  overdueByUser: Record<string, number>;
}

// ---------- intents ----------

export type Intent =
  | { kind: "notify"; rule: RuleCode; dedupeKey: string; userId: string; type: string; title: string; body?: string; leadId?: string; href?: string }
  | { kind: "task"; rule: RuleCode; dedupeKey: string; assigneeId: string; leadId: string | null; type: TaskType; title: string; dueAt: Date }
  | { kind: "message"; rule: RuleCode; dedupeKey: string; leadId: string; templateCode: string; vars: Record<string, string> }
  | { kind: "timeline"; rule: RuleCode; dedupeKey: string; leadId: string; body: string };

const name = (l: Pick<SnapLead, "firstName" | "lastName">) => `${l.firstName}${l.lastName ? ` ${l.lastName}` : ""}`;
const href = (leadId: string) => `/dashboard/leads/${leadId}`;
const weekNo = (d: Date) => {
  const start = Date.UTC(2026, 0, 1);
  return Math.floor((d.getTime() - start) / (7 * 86400_000));
};
const managerOf = (users: SnapUser[], branchId: string | null) => users.find((u) => u.role === "SALES_MANAGER" && u.branchId === branchId);
const OPEN = (s: LeadStage) => s !== "CLOSED_WON" && s !== "CLOSED_LOST";
const UNANSWERED: CallOutcome[] = ["NO_ANSWER", "SWITCHED_OFF", "BUSY"];

export function evaluateRules(snap: Snapshot, settings: Settings, now: Date): Intent[] {
  const wh: WorkingHours = settings.workingHours;
  const off = new Set(settings.reminders.disabledRules);
  const out: Intent[] = [];
  const owners = snap.users.filter((u) => u.role === "OWNER");

  for (const l of snap.leads) {
    if (!OPEN(l.stage)) continue;
    const since = l.assignedAt ?? l.createdAt;
    const mins = workingMinutesBetween(since, now, wh);

    // R1 / R1b — first-contact SLA (working minutes since assignment)
    if (l.stage === "NEW" && !l.contacted && l.ownerId && l.locationStatus !== "OUT_OF_AREA") {
      if (!off.has("R1") && mins > settings.sla.firstContactMins) {
        out.push({
          kind: "notify",
          rule: "R1",
          dedupeKey: `R1:${l.id}`,
          userId: l.ownerId,
          type: "SLA_BREACH",
          title: `SLA breached: ${l.refCode} not contacted in ${fmtMins(settings.sla.firstContactMins)}`,
          body: `${name(l)} is still waiting for a first call.`,
          leadId: l.id,
          href: href(l.id),
        });
        out.push({ kind: "timeline", rule: "R1", dedupeKey: `R1:${l.id}`, leadId: l.id, body: `R1 · First-contact SLA breached (${fmtMins(settings.sla.firstContactMins)} working time) — owner alerted.` });
      }
      if (!off.has("R1b") && mins > settings.sla.escalateMins) {
        const mgr = managerOf(snap.users, l.branchId) ?? owners[0];
        if (mgr) {
          out.push({
            kind: "task",
            rule: "R1b",
            dedupeKey: `R1b:${l.id}`,
            assigneeId: mgr.id,
            leadId: l.id,
            type: "ESCALATION",
            title: `Escalation: ${l.refCode} ${name(l)} not contacted for ${fmtMins(settings.sla.escalateMins)}`,
            dueAt: now,
          });
          out.push({ kind: "notify", rule: "R1b", dedupeKey: `R1b:${l.id}`, userId: mgr.id, type: "ESCALATION", title: `Escalated: ${l.refCode} not contacted in ${fmtMins(settings.sla.escalateMins)}`, leadId: l.id, href: href(l.id) });
          out.push({ kind: "timeline", rule: "R1b", dedupeKey: `R1b:${l.id}`, leadId: l.id, body: `R1b · Escalated to ${mgr.name} (no contact for ${fmtMins(settings.sla.escalateMins)} working time).` });
        }
      }
    }

    // R3 — stale stage (no activity for N days and nothing scheduled)
    const staleDays = settings.reminders.staleDays[l.stage];
    if (!off.has("R3") && staleDays && l.ownerId && l.openTasks.length === 0 && l.stage !== "NEW") {
      const idleDays = (now.getTime() - l.lastActivityAt.getTime()) / 86400_000;
      if (idleDays >= staleDays) {
        const days = Math.floor(idleDays);
        out.push({
          kind: "task",
          rule: "R3",
          dedupeKey: `R3:${l.id}:${l.stage}:${istDateKey(now)}`,
          assigneeId: l.ownerId,
          leadId: l.id,
          type: l.stage === "QUOTATION_SENT" ? "QUOTATION_FOLLOW_UP" : "FOLLOW_UP",
          title: `No activity for ${days} days in ${STAGE_LABEL[l.stage].replace(/^\d+\.\s*/, "")} — follow up with ${l.firstName}`,
          dueAt: addWorkingMinutes(now, 60, wh),
        });
        out.push({ kind: "timeline", rule: "R3", dedupeKey: `R3:${l.id}:${l.stage}:${istDateKey(now)}`, leadId: l.id, body: `R3 · No activity for ${days} days in ${STAGE_LABEL[l.stage]} — follow-up task created.` });
      }
    }

    // R6 — 3 unanswered calls in 10 days and no connected call since
    if (!off.has("R6") && l.ownerId) {
      const recent = l.calls.filter((c) => now.getTime() - c.at.getTime() <= 10 * 86400_000);
      const lastConnected = recent.find((c) => c.outcome === "CONNECTED");
      const unanswered = recent.filter((c) => c.outcome && UNANSWERED.includes(c.outcome) && (!lastConnected || c.at > lastConnected.at));
      if (unanswered.length >= settings.reminders.noResponseCalls) {
        out.push({
          kind: "notify",
          rule: "R6",
          dedupeKey: `R6:${l.id}:${weekNo(now)}`,
          userId: l.ownerId,
          type: "NO_RESPONSE",
          title: `${unanswered.length} unanswered calls — ${l.refCode} ${name(l)}`,
          body: "Send the close-the-loop message, or mark Closed Lost – No response.",
          leadId: l.id,
          href: href(l.id),
        });
      }
    }

    // R8 — still no location after 24 h
    if (!off.has("R8") && l.locationStatus === "NEEDS_LOCATION" && now.getTime() - l.createdAt.getTime() > 24 * 3600_000) {
      const deskLead = snap.users.find((u) => u.role === "PRESALES");
      for (const uid of new Set([l.ownerId, deskLead?.id].filter(Boolean) as string[])) {
        out.push({ kind: "notify", rule: "R8", dedupeKey: `R8:${l.id}:${uid}`, userId: uid, type: "NEEDS_LOCATION", title: `Still no location after 24 h: ${l.refCode} ${name(l)}`, leadId: l.id, href: "/dashboard/queues" });
      }
    }
  }

  // R7 — revive closed On hold / Timeline leads
  for (const l of snap.leads) {
    if (off.has("R7") || l.stage !== "CLOSED_LOST" || !l.reviveAt || l.reviveAt > now || !l.ownerId) continue;
    if (l.lostReason !== "ON_HOLD" && l.lostReason !== "TIMELINE") continue;
    out.push({ kind: "task", rule: "R7", dedupeKey: `R7:${l.id}`, assigneeId: l.ownerId, leadId: l.id, type: "REVIVE", title: `Revive ${name(l)} — possession was due, time to re-engage`, dueAt: now });
    out.push({ kind: "notify", rule: "R7", dedupeKey: `R7:${l.id}`, userId: l.ownerId, type: "REVIVE", title: `Possession was due — time to re-engage ${l.refCode} ${name(l)}`, leadId: l.id, href: href(l.id) });
    out.push({ kind: "timeline", rule: "R7", dedupeKey: `R7:${l.id}`, leadId: l.id, body: `R7 · Revive date reached (${formatIST(l.reviveAt, "d MMM")}) — re-engage task created.` });
  }

  // R2 — follow-up due
  if (!off.has("R2")) {
    for (const t of snap.dueFollowUps) {
      if (t.dueAt > now) continue;
      out.push({ kind: "notify", rule: "R2", dedupeKey: `R2:${t.id}`, userId: t.assigneeId, type: "FOLLOW_UP_DUE", title: `Follow-up due: ${t.title}`, body: `Due ${formatIST(t.dueAt)}`, leadId: t.leadId ?? undefined, href: t.leadId ? href(t.leadId) : "/dashboard/my-day" });
    }
  }

  // R4 / R5 — appointments
  for (const a of snap.appointments) {
    const until = a.scheduledAt.getTime() - now.getTime();
    if (!off.has("R4") && until > 0 && until <= settings.reminders.appointmentHours * 3600_000) {
      if (a.hasPhone) {
        out.push({
          kind: "message",
          rule: "R4",
          dedupeKey: `R4:${a.id}`,
          leadId: a.leadId,
          templateCode: "appointment_reminder",
          vars: { date: formatIST(a.scheduledAt, "EEE d MMM"), time: formatIST(a.scheduledAt, "h:mm a"), branch: a.branchName, host_name: a.hostName ?? "Our team" },
        });
      }
      if (a.hostId) {
        out.push({ kind: "task", rule: "R4", dedupeKey: `R4:${a.id}`, assigneeId: a.hostId, leadId: a.leadId, type: "APPOINTMENT_PREP", title: `Prepare for ${a.leadName}'s visit to ${a.branchName} (${formatIST(a.scheduledAt, "EEE h:mm a")})`, dueAt: new Date(a.scheduledAt.getTime() - 3600_000) });
      }
    }
    if (!off.has("R5") && a.hostId && now.getTime() > a.scheduledAt.getTime() + 2 * 3600_000) {
      out.push({ kind: "task", rule: "R5", dedupeKey: `R5:${a.id}`, assigneeId: a.hostId, leadId: a.leadId, type: "VISIT_OUTCOME", title: `Did ${a.leadName} visit? Mark visited / no-show`, dueAt: now });
    }
  }

  // R9 — once a day after digestTime IST, one notification per manager/owner
  if (!off.has("R9") && now >= wallTime(now, settings.reminders.digestTime, wh.tz)) {
    const name = (id: string) => snap.users.find((u) => u.id === id)?.name.split(" ")[0] ?? "?";
    for (const u of snap.users.filter((x) => x.role === "OWNER" || x.role === "SALES_MANAGER")) {
      const team = u.role === "OWNER" ? snap.users : snap.users.filter((x) => x.branchId === u.branchId);
      const overdue = team
        .map((m) => [m.id, snap.overdueByUser[m.id] ?? 0] as const)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
      const y = snap.yesterday;
      out.push({
        kind: "notify",
        rule: "R9",
        dedupeKey: `R9:${u.id}:${istDateKey(now)}`,
        userId: u.id,
        type: "DIGEST",
        title: `Morning digest · Yesterday: ${y.newLeads} new, ${y.outOfArea} out-of-area, ${y.needsLocation} need location`,
        body: overdue.length ? `Overdue follow-ups: ${overdue.map(([id, n]) => `${name(id)} ${n}`).join(", ")}` : "No overdue follow-ups. 👏",
        href: "/dashboard",
      });
    }
  }

  return out;
}

function fmtMins(m: number) {
  if (m < 60) return `${m} min`;
  const h = m / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
}

export function summarise(intents: Intent[]) {
  const byRule: Record<string, number> = {};
  for (const i of intents) byRule[i.rule] = (byRule[i.rule] ?? 0) + 1;
  return byRule;
}
