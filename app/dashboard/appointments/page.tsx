import Link from "next/link";
import { CalendarX } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader, Chip, Tabs } from "@/components/ui";
import { formatIST, istDateKey, startOfIstDay } from "@/lib/domain/time";
import { shortBranch } from "@/lib/domain/routing/decide";
import { AppointmentActions } from "./appointment-actions";

const STATUS_TONE: Record<string, string> = {
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-200",
  VISITED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  NO_SHOW: "bg-rose-50 text-rose-700 ring-rose-200",
  RESCHEDULED: "bg-slate-100 text-slate-500 ring-slate-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200",
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser();
  const range = (await searchParams).range === "past" ? "past" : "upcoming";
  const now = new Date();
  const scope: Prisma.AppointmentWhereInput =
    user.role === "OWNER" || user.role === "ADMIN"
      ? {}
      : user.role === "SALES_MANAGER"
        ? { OR: [{ branchId: user.branchId ?? "" }, { hostId: user.id }] }
        : { OR: [{ hostId: user.id }, { lead: { ownerId: user.id } }] };
  const when: Prisma.AppointmentWhereInput =
    range === "past" ? { scheduledAt: { lt: startOfIstDay(now), gte: startOfIstDay(now, -30) } } : { scheduledAt: { gte: startOfIstDay(now), lt: startOfIstDay(now, 15) } };
  const appts = await prisma.appointment.findMany({
    where: { AND: [scope, when, range === "upcoming" ? { status: { not: "RESCHEDULED" } } : {}] },
    include: { lead: { select: { id: true, refCode: true, firstName: true, lastName: true, salutation: true } }, branch: { select: { name: true } }, host: { select: { name: true } } },
    orderBy: { scheduledAt: range === "past" ? "desc" : "asc" },
    take: 200,
  });
  const days = new Map<string, typeof appts>();
  for (const a of appts) {
    const k = istDateKey(a.scheduledAt);
    days.set(k, [...(days.get(k) ?? []), a]);
  }
  const todayKey = istDateKey(now);
  const tomorrowKey = istDateKey(startOfIstDay(now, 1));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Showroom visits" description="Book from a lead's page. A WhatsApp reminder goes to the customer 24 h before, and the host gets a prep task." />
      <Tabs
        active={range}
        tabs={[
          { key: "upcoming", label: "Next 2 weeks", href: "?range=upcoming" },
          { key: "past", label: "Past 30 days", href: "?range=past" },
        ]}
      />
      {appts.length === 0 ? (
        <div className="card">
          <EmptyState icon={CalendarX} title="No visits">
            Book a showroom visit from any lead — it shows up here, grouped by day.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-6">
          {[...days.entries()].map(([key, list]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold text-slate-500">
                {key === todayKey ? "Today · " : key === tomorrowKey ? "Tomorrow · " : ""}
                {formatIST(list[0].scheduledAt, "EEEE d MMM")}
              </h2>
              <div className="card divide-y divide-slate-100">
                {list.map((a) => (
                  <div key={a.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="w-20 shrink-0 text-lg font-semibold text-ink">{formatIST(a.scheduledAt, "h:mm a")}</div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/leads/${a.lead.id}`} className="font-medium text-ink hover:underline">
                        {a.lead.salutation ? `${a.lead.salutation}. ` : ""}
                        {a.lead.firstName} {a.lead.lastName}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {a.lead.refCode} · {shortBranch(a.branch.name)} · host {a.host?.name ?? "—"}
                      </div>
                    </div>
                    <Chip className={STATUS_TONE[a.status]}>{a.status.charAt(0) + a.status.slice(1).toLowerCase().replace("_", "-")}</Chip>
                    {a.status === "SCHEDULED" && <AppointmentActions id={a.id} />}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
