// runReminderEngine(): loads a snapshot, evaluates R1–R9, persists intents idempotently (dedupeKey on
// Task / Notification / OutboundMessage). Called by /api/cron/reminders, `npm run cron:dev` and "Run now".
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { notify } from "@/lib/domain/notify";
import { sendTemplate } from "@/lib/domain/messaging/send";
import { recomputeNextFollowUp } from "@/lib/domain/leads/workflow";
import { OPEN_STAGES } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { startOfIstDay } from "@/lib/domain/time";
import { evaluateRules, type Intent, type Snapshot } from "./rules";

export interface EngineSummary {
  ranAt: string;
  evaluatedLeads: number;
  tasksCreated: number;
  notificationsCreated: number;
  messagesSent: number;
  byRule: Record<string, number>;
  durationMs: number;
}

const FOLLOW_UP_TASKS = ["FOLLOW_UP", "QUOTATION_FOLLOW_UP", "REVIVE", "FIRST_CALL", "CAPTURE_LOCATION"] as const;

export async function loadSnapshot(now: Date): Promise<Snapshot> {
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400_000);
  const leads = await prisma.lead.findMany({
    where: {
      OR: [{ stage: { in: OPEN_STAGES } }, { stage: "CLOSED_LOST", lostReason: { in: ["ON_HOLD", "TIMELINE"] }, reviveAt: { lte: now } }],
    },
    select: {
      id: true,
      refCode: true,
      firstName: true,
      lastName: true,
      salutation: true,
      stage: true,
      lostReason: true,
      reviveAt: true,
      ownerId: true,
      branchId: true,
      locationStatus: true,
      assignedAt: true,
      createdAt: true,
      lastActivityAt: true,
      firstContactedAt: true,
      activities: {
        where: { OR: [{ type: "CALL", createdAt: { gte: tenDaysAgo } }, { type: { in: ["CALL", "WHATSAPP", "MESSAGE_SENT"] }, userId: { not: null } }] },
        select: { type: true, callOutcome: true, createdAt: true, userId: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      tasks: { where: { status: { in: ["OPEN", "SNOOZED"] }, type: { notIn: ["FIRST_CALL", "CAPTURE_LOCATION", "OUT_OF_AREA_REVIEW"] } }, select: { id: true, type: true, dueAt: true } },
    },
  });

  const yStart = startOfIstDay(now, -1);
  const tStart = startOfIstDay(now);
  const [dueFollowUps, appointments, users, yNew, yOoa, yNeeds, overdue] = await Promise.all([
    prisma.task.findMany({
      where: { status: "OPEN", type: { in: [...FOLLOW_UP_TASKS] }, dueAt: { lte: now, gte: new Date(now.getTime() - 7 * 86400_000) } },
      select: { id: true, leadId: true, assigneeId: true, type: true, title: true, dueAt: true },
    }),
    prisma.appointment.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: new Date(now.getTime() - 3 * 86400_000), lte: new Date(now.getTime() + 48 * 3600_000) } },
      include: { lead: { select: { firstName: true, lastName: true, salutation: true, refCode: true, phoneE164: true } }, branch: { select: { name: true } }, host: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, branchId: true } }),
    prisma.lead.count({ where: { createdAt: { gte: yStart, lt: tStart } } }),
    prisma.lead.count({ where: { createdAt: { gte: yStart, lt: tStart }, locationStatus: "OUT_OF_AREA" } }),
    prisma.lead.count({ where: { createdAt: { gte: yStart, lt: tStart }, locationStatus: "NEEDS_LOCATION" } }),
    prisma.task.groupBy({ by: ["assigneeId"], where: { status: "OPEN", type: { in: ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP"] }, dueAt: { lt: now } }, _count: true }),
  ]);

  return {
    leads: leads.map((l) => ({
      ...l,
      contacted: !!l.firstContactedAt || l.activities.some((a) => a.userId && (a.type === "CALL" || a.type === "WHATSAPP" || a.type === "MESSAGE_SENT")),
      calls: l.activities.filter((a) => a.type === "CALL" && a.createdAt >= tenDaysAgo).map((a) => ({ outcome: a.callOutcome, at: a.createdAt })),
      openTasks: l.tasks,
    })),
    dueFollowUps,
    appointments: appointments.map((a) => ({
      id: a.id,
      leadId: a.leadId,
      leadName: `${a.lead.salutation ? `${a.lead.salutation}. ` : ""}${a.lead.salutation ? (a.lead.lastName ?? a.lead.firstName) : a.lead.firstName}`,
      leadRef: a.lead.refCode,
      branchName: shortBranch(a.branch.name),
      hostId: a.hostId,
      hostName: a.host?.name ?? null,
      scheduledAt: a.scheduledAt,
      hasPhone: !!a.lead.phoneE164,
    })),
    users,
    yesterday: { newLeads: yNew, outOfArea: yOoa, needsLocation: yNeeds },
    overdueByUser: Object.fromEntries(overdue.map((o) => [o.assigneeId, o._count])),
  };
}

async function persist(intent: Intent, now: Date): Promise<"task" | "notify" | "message" | null> {
  switch (intent.kind) {
    case "notify": {
      const n = await notify({ userId: intent.userId, type: intent.type, title: intent.title, body: intent.body, leadId: intent.leadId, href: intent.href, dedupeKey: intent.dedupeKey });
      return n > 0 ? "notify" : null;
    }
    case "task": {
      if (await prisma.task.findUnique({ where: { dedupeKey: intent.dedupeKey }, select: { id: true } })) return null;
      try {
        await prisma.task.create({
          data: { leadId: intent.leadId, assigneeId: intent.assigneeId, type: intent.type, title: intent.title, dueAt: intent.dueAt, ruleCode: intent.rule, dedupeKey: intent.dedupeKey, createdAt: now },
        });
        if (intent.leadId) await recomputeNextFollowUp(intent.leadId);
        return "task";
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
        throw e;
      }
    }
    case "message": {
      const msg = await sendTemplate({ leadId: intent.leadId, templateCode: intent.templateCode, vars: intent.vars, dedupeKey: intent.dedupeKey });
      return msg ? "message" : null;
    }
    default:
      return null;
  }
}

export async function runReminderEngine({ now = new Date() }: { now?: Date } = {}): Promise<EngineSummary> {
  const started = Date.now();
  // Wake snoozed tasks whose time has come: they become due at the snooze time
  const woken = await prisma.task.findMany({ where: { status: "SNOOZED", snoozedUntil: { lte: now } }, select: { id: true, snoozedUntil: true } });
  for (const t of woken) await prisma.task.update({ where: { id: t.id }, data: { status: "OPEN", dueAt: t.snoozedUntil!, snoozedUntil: null } });
  const [settings, snap] = await Promise.all([getSettings(), loadSnapshot(now)]);
  const intents = evaluateRules(snap, settings, now);

  const summary: EngineSummary = { ranAt: now.toISOString(), evaluatedLeads: snap.leads.length, tasksCreated: 0, notificationsCreated: 0, messagesSent: 0, byRule: {}, durationMs: 0 };
  const createdKeys = new Set<string>();

  for (const intent of intents.filter((i) => i.kind !== "timeline")) {
    const created = await persist(intent, now);
    if (!created) continue;
    createdKeys.add(`${intent.rule}|${intent.dedupeKey}`);
    summary.byRule[intent.rule] = (summary.byRule[intent.rule] ?? 0) + 1;
    if (created === "task") summary.tasksCreated++;
    if (created === "notify") summary.notificationsCreated++;
    if (created === "message") summary.messagesSent++;
  }
  // Explainability: timeline lines only for things that actually fired in this run
  const lines = intents.filter((i): i is Extract<Intent, { kind: "timeline" }> => i.kind === "timeline" && createdKeys.has(`${i.rule}|${i.dedupeKey}`));
  if (lines.length) {
    await prisma.activity.createMany({ data: lines.map((l) => ({ leadId: l.leadId, type: "SYSTEM" as const, body: l.body, meta: { rule: l.rule }, createdAt: now })) });
  }

  summary.durationMs = Date.now() - started;
  await prisma.appSetting.upsert({
    where: { key: "engine.lastRun" },
    update: { value: summary as unknown as Prisma.InputJsonValue },
    create: { key: "engine.lastRun", value: summary as unknown as Prisma.InputJsonValue },
  });
  return summary;
}

export function summaryText(s: EngineSummary) {
  const parts = Object.entries(s.byRule).map(([r, n]) => `${r}×${n}`);
  return parts.length ? `Reminders ran: ${parts.join(", ")} (${s.tasksCreated} tasks, ${s.notificationsCreated} notifications, ${s.messagesSent} messages)` : `Reminders ran: nothing new (${s.evaluatedLeads} leads checked)`;
}
