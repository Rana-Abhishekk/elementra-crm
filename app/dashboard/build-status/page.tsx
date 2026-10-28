import { FeatureBadge } from "@/components/feature-badge";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { FEATURES, STATUS_META, featuresByWeek, type FeatureStatus } from "@/lib/features";
import { cn } from "@/lib/utils";

const ORDER: FeatureStatus[] = ["LIVE", "SIMULATED", "PREVIEW", "IN_PROGRESS", "PLANNED"];

export default async function BuildStatusPage() {
  await requireUser();
  const counts = ORDER.map((s) => ({ s, n: FEATURES.filter((f) => f.status === s).length }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Build Status"
        description="Everything in the proposal, honestly marked: what works today, what runs in a simulator until your accounts are connected, and what's still being built."
      />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(({ s, n }) => (
          <div key={s} className={cn("rounded-xl p-4 ring-1 ring-inset", STATUS_META[s].className)}>
            <div className="text-3xl font-semibold">{n}</div>
            <div className="text-sm font-medium">{STATUS_META[s].label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-8">
        {featuresByWeek().map(({ week, label, items }) => (
          <section key={week}>
            <h2 className={cn("mb-3 text-lg font-semibold", week === "BEYOND" ? "text-gold" : "text-ink")}>{label}</h2>
            <div className="card divide-y divide-slate-100">
              {items.map((f) => (
                <div key={f.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="w-28 shrink-0 pt-0.5">
                    <FeatureBadge status={f.status} showLive addon={f.isAddon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">{f.title}</div>
                    <div className="text-sm text-slate-500">{f.note}</div>
                    {f.gaps && <div className="mt-0.5 text-xs text-amber-700">⏳ {f.gaps}</div>}
                  </div>
                  <div className="text-xs text-slate-400 sm:pt-1">{f.id}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
