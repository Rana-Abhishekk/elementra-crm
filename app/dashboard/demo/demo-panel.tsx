"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Shuffle, Sparkles } from "lucide-react";
import { RoutingCard } from "@/components/routing-card";
import type { DecisionSummary } from "@/lib/domain/leads/ingest";
import { randomBurstAction, runScenarioAction } from "./actions";
import { DemoTools } from "./demo-tools";

export function DemoPanel({ scenarios }: { scenarios: { id: number; title: string; hint: string }[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);
  const [last, setLast] = useState<DecisionSummary | null>(null);

  function run(id: number) {
    setBusy(id);
    start(async () => {
      const res = await runScenarioAction(id);
      setBusy(null);
      if (!res.ok) return void toast.error(res.error);
      setLast(res.decision);
      window.dispatchEvent(new Event("elementra:poll"));
      toast.success(res.decision.toast, { description: `${res.decision.refCode} · ${res.decision.name}` });
    });
  }

  function burst() {
    setBusy(0);
    start(async () => {
      const res = await randomBurstAction();
      setBusy(null);
      if (res.ok) toast.success(`10 new leads: ${res.summary}`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Routing scenarios</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                disabled={pending}
                onClick={() => run(s.id)}
                className="card flex items-start gap-3 p-4 text-left transition hover:border-gold hover:shadow-sm disabled:opacity-60"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {busy === s.id ? <Loader2 className="size-3.5 animate-spin" /> : s.id}
                </span>
                <span>
                  <span className="block font-medium text-ink">{s.title}</span>
                  <span className="block text-xs text-slate-500">{s.hint}</span>
                </span>
              </button>
            ))}
            <button disabled={pending} onClick={burst} className="card flex items-center gap-3 border-dashed p-4 text-left hover:border-gold disabled:opacity-60">
              <span className="flex size-7 items-center justify-center rounded-full bg-gold text-brand">
                {busy === 0 ? <Loader2 className="size-3.5 animate-spin" /> : <Shuffle className="size-3.5" />}
              </span>
              <span>
                <span className="block font-medium text-ink">10 random leads</span>
                <span className="block text-xs text-slate-500">A realistic burst from all channels</span>
              </span>
            </button>
          </div>
        </section>
        <DemoTools />
      </div>
      <aside className="lg:sticky lg:top-20 lg:self-start">
        {last ? (
          <div className="space-y-3">
            <RoutingCard
              title={`${last.refCode} · ${last.name}`}
              data={{ rule: last.rule, branchName: last.branchName, ownerName: last.ownerName, explanation: last.explanation, candidates: last.candidates, skipped: last.skipped }}
            />
            <Link href={`/dashboard/leads/${last.leadId}`} className="btn w-full">
              Open the lead <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500">
            <Sparkles className="size-6 text-gold" />
            Run a scenario — the routing decision and its explanation appear here.
          </div>
        )}
      </aside>
    </div>
  );
}
