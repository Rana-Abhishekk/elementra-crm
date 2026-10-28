import { prisma } from "@/lib/prisma";
import { formatMoney, STAGE_LABELS } from "@/lib/format";

export default async function OverviewPage() {
  const [contacts, companies, pipeline] = await Promise.all([
    prisma.contact.count(),
    prisma.company.count(),
    prisma.deal.groupBy({ by: ["stage"], _count: true, _sum: { amount: true } }),
  ]);
  const byStage = new Map(pipeline.map((p) => [p.stage, p]));
  const openValue = pipeline
    .filter((p) => p.stage !== "WON" && p.stage !== "LOST")
    .reduce((sum, p) => sum + (p._sum.amount ?? 0), 0);

  const stats = [
    { label: "Contacts", value: contacts },
    { label: "Companies", value: companies },
    { label: "Open pipeline", value: formatMoney(openValue) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-3 font-medium">Pipeline by stage</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(STAGE_LABELS).map(([stage, label]) => {
            const row = byStage.get(stage as keyof typeof STAGE_LABELS);
            return (
              <div key={stage} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="font-semibold">{row?._count ?? 0}</div>
                <div className="text-xs text-slate-500">{formatMoney(row?._sum.amount ?? 0)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
