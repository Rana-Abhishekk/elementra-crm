"use client";

import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { FeatureBadge } from "@/components/feature-badge";
import { useServerAction } from "@/lib/use-action";
import { simulateSheetRowAction } from "../demo/actions";
import { testMetaWebhookAction } from "./actions";

export interface IntegrationCard {
  key: string;
  name: string;
  status: "Connected" | "Simulator" | "Awaiting client access" | "Not started";
  badge: string;
  stat: string;
  ready: string[];
  need: string[];
  test?: "meta" | "sheets" | "website";
}

const TONE: Record<IntegrationCard["status"], string> = {
  Connected: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Simulator: "bg-teal-50 text-teal-700 ring-teal-200",
  "Awaiting client access": "bg-amber-50 text-amber-800 ring-amber-200",
  "Not started": "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Integrations({ cards, demo }: { cards: IntegrationCard[]; demo: boolean }) {
  const { pending, run } = useServerAction();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <Card key={c.key} className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-ink">{c.name}</div>
              <div className="text-xs text-slate-500">{c.stat}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Chip className={TONE[c.status]}>{c.status}</Chip>
              <FeatureBadge feature={c.badge} />
            </div>
          </div>
          <div className="mt-3 grid flex-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="label">Ready on our side</div>
              <ul className="space-y-1">
                {c.ready.map((r) => (
                  <li key={r} className="flex gap-1.5 text-slate-700">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="label">What we need from you</div>
              <ul className="space-y-1">
                {c.need.map((r) => (
                  <li key={r} className="flex gap-1.5 text-slate-700">
                    <Clock className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {c.test === "meta" && (
            <button className="btn-secondary mt-4 self-start" disabled={pending} onClick={() => run(testMetaWebhookAction)}>
              Send test webhook
            </button>
          )}
          {c.test === "sheets" && demo && (
            <button className="btn-secondary mt-4 self-start" disabled={pending} onClick={() => run(simulateSheetRowAction)}>
              Simulate new sheet row
            </button>
          )}
          {c.test === "website" && (
            <div className="mt-4 space-y-2">
              <Link href="/enquire" target="_blank" className="btn-secondary">
                Open the form
              </Link>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
{`curl -X POST $SITE/api/public/leads \\
  -H "x-api-key: $PUBLIC_FORM_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"name":"…","phone":"…","pincode":"400053"}'`}
              </pre>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
