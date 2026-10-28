import { CalendarCheck, PartyPopper } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader, Stat } from "@/components/ui";
import { startOfIstDay, formatIST } from "@/lib/domain/time";
import { TaskList, type TaskRow } from "./task-list";

export default async function MyDayPage() {
  const user = await requireUser();
  const now = new Date();
  const tomorrow = startOfIstDay(now, 1);
  const weekEnd = startOfIstDay(now, 8);
  const weekStart = startOfIstDay(now, -6);

  const [tasks, clearedThisWeek, visitsToday] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { in: ["OPEN", "SNOOZED"] }, OR: [{ dueAt: { lt: weekEnd } }, { snoozedUntil: { lt: weekEnd } }] },
      include: { lead: { select: { id: true, refCode: true, firstName: true, lastName: true, phoneE164: true, stage: true } } },
      orderBy: { dueAt: "asc" },
      take: 300,
    }),
    prisma.task.count({ where: { assigneeId: user.id, status: "DONE", completedAt: { gte: weekStart } } }),
    prisma.appointment.count({ where: { OR: [{ hostId: user.id }, { lead: { ownerId: user.id } }], status: "SCHEDULED", scheduledAt: { gte: startOfIstDay(now), lt: tomorrow } } }),
  ]);

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    dueAt: t.status === "SNOOZED" && t.snoozedUntil ? t.snoozedUntil : t.dueAt,
    ruleCode: t.ruleCode,
    snoozed: t.status === "SNOOZED" && !!t.snoozedUntil && t.snoozedUntil > now,
    lead: t.lead ? { id: t.lead.id, ref: t.lead.refCode, name: `${t.lead.firstName} ${t.lead.lastName ?? ""}`.trim(), phone: t.lead.phoneE164 } : null,
  }));
  const overdue = rows.filter((r) => !r.snoozed && r.dueAt < now);
  const today = rows.filter((r) => !r.snoozed && r.dueAt >= now && r.dueAt < tomorrow);
  const upcoming = rows.filter((r) => !r.snoozed && r.dueAt >= tomorrow);
  const snoozed = rows.filter((r) => r.snoozed);
  const first = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Good ${Number(formatIST(now, "H")) < 12 ? "morning" : Number(formatIST(now, "H")) < 17 ? "afternoon" : "evening"}, ${first}`}
        description={clearedThisWeek > 0 ? `You cleared ${clearedThisWeek} task${clearedThisWeek === 1 ? "" : "s"} this week. Keep it going.` : "Here's what needs you today."}
      />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "red" : undefined} />
        <Stat label="Due today" value={today.length} tone={today.length ? "amber" : undefined} />
        <Stat label="Visits today" value={visitsToday} hint={<CalendarCheck className="inline size-3.5" />} />
      </div>
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={PartyPopper} title="All clear">
            No follow-ups due this week. New leads and reminders will appear here automatically.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-6">
          <TaskList title="Overdue" tone="red" rows={overdue} />
          <TaskList title="Today" tone="amber" rows={today} />
          <TaskList title="Upcoming (7 days)" rows={upcoming} />
          {snoozed.length > 0 && <TaskList title="Snoozed" rows={snoozed} />}
        </div>
      )}
    </div>
  );
}
