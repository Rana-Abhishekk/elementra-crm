import { prisma } from "@/lib/prisma";
import { can, requirePagePermission } from "@/lib/auth";
import { getSettings } from "@/lib/data/settings";
import { PageHeader } from "@/components/ui";
import { RULES } from "@/lib/domain/reminders/rules";
import type { EngineSummary } from "@/lib/domain/reminders/engine";
import { startOfIstDay } from "@/lib/domain/time";
import { AutomationCards, RunNow, type RuleCard } from "./automation-cards";

export default async function AutomationsPage() {
  const user = await requirePagePermission("automations.manage");
  const settings = await getSettings();
  const today = startOfIstDay(new Date());
  const weekAgo = startOfIstDay(new Date(), -6);
  const [tasks, notes, msgs, lastRun] = await Promise.all([
    prisma.task.findMany({ where: { ruleCode: { not: null }, createdAt: { gte: weekAgo } }, select: { ruleCode: true, title: true, createdAt: true, lead: { select: { id: true, refCode: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.notification.findMany({ where: { dedupeKey: { startsWith: "R" }, createdAt: { gte: weekAgo } }, select: { dedupeKey: true, title: true, createdAt: true, leadId: true }, orderBy: { createdAt: "desc" } }),
    prisma.outboundMessage.findMany({ where: { dedupeKey: { startsWith: "R4:" }, createdAt: { gte: weekAgo } }, select: { body: true, createdAt: true, leadId: true }, orderBy: { createdAt: "desc" } }),
    prisma.appSetting.findUnique({ where: { key: "engine.lastRun" } }),
  ]);

  const ruleOf = (key: string | null) => key?.match(/^(R1b|R\d)/)?.[1] ?? null;
  const cards: RuleCard[] = RULES.map((r) => {
    const firings = [
      ...tasks.filter((t) => t.ruleCode === r.code).map((t) => ({ at: t.createdAt, text: t.title, leadId: t.lead?.id ?? null })),
      ...notes.filter((n) => ruleOf(n.dedupeKey) === r.code).map((n) => ({ at: n.createdAt, text: n.title, leadId: n.leadId })),
      ...(r.code === "R4" ? msgs.map((m) => ({ at: m.createdAt, text: `WhatsApp reminder: ${m.body.slice(0, 70)}…`, leadId: m.leadId })) : []),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
    return {
      code: r.code,
      name: r.name,
      description: r.describe(settings),
      enabled: !settings.reminders.disabledRules.includes(r.code),
      firedToday: firings.filter((f) => f.at >= today).length,
      firedWeek: firings.length,
      recent: firings.slice(0, 5),
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Automations"
        description="The reminder robot. These rules run on the server — every minute locally (npm run cron:dev), daily on Vercel Hobby — even when every laptop is closed."
        actions={<RunNow />}
      />
      <AutomationCards
        cards={cards}
        settings={settings}
        canEditSla={can(user, "settings.manage")}
        lastRun={(lastRun?.value as unknown as EngineSummary | null) ?? null}
      />
    </div>
  );
}
