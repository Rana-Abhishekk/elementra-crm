"use client";

import { useState } from "react";
import type { TemplateStatus } from "@prisma/client";
import { Card, Chip } from "@/components/ui";
import { renderTemplate, SAMPLE_VARS } from "@/lib/domain/messaging/render";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { saveTemplateAction } from "./actions";

interface T {
  id: string;
  code: string;
  language: string;
  name: string;
  category: string;
  status: TemplateStatus;
  body: string;
}

const STATUS_TONE: Record<TemplateStatus, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-800 ring-amber-200",
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};
const STATUS_LABEL: Record<TemplateStatus, string> = { APPROVED: "Approved", PENDING_APPROVAL: "Pending approval", DRAFT: "Draft", REJECTED: "Rejected" };

export function TemplatesEditor({ templates }: { templates: T[] }) {
  const { pending, run } = useServerAction();
  const [selected, setSelected] = useState(templates[0]?.id);
  const t = templates.find((x) => x.id === selected);
  const [drafts, setDrafts] = useState<Record<string, { body: string; status: TemplateStatus }>>({});
  const draft = t ? (drafts[t.id] ?? { body: t.body, status: t.status }) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="divide-y divide-slate-100 self-start">
        {templates.map((x) => (
          <button key={x.id} onClick={() => setSelected(x.id)} className={cn("block w-full px-4 py-2.5 text-left hover:bg-slate-50", x.id === selected && "bg-gold-light/50")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{x.name}</span>
              <span className="text-xs text-slate-400 uppercase">{x.language}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <Chip className={STATUS_TONE[x.status]}>{STATUS_LABEL[x.status]}</Chip>
              <span className="text-[11px] text-slate-400">{x.category.toLowerCase()}</span>
            </div>
          </button>
        ))}
      </Card>
      {t && draft && (
        <Card className="space-y-4 p-4">
          <div>
            <div className="text-xs text-slate-500">
              {t.code} · {t.language === "hi" ? "Hindi" : "English"} · {t.category.toLowerCase()}
            </div>
            <h2 className="text-lg font-semibold text-ink">{t.name}</h2>
          </div>
          <label className="block text-sm">
            <span className="label">Body — variables: {"{{name}} {{product}} {{branch}} {{rep_name}} {{date}} {{time}} {{host_name}} {{map_link}} {{location}}"}</span>
            <textarea className="field" rows={5} value={draft.body} onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...draft, body: e.target.value } })} />
          </label>
          <div>
            <div className="label">Live preview (sample values)</div>
            <div className="max-w-md rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-wrap">{renderTemplate(draft.body, SAMPLE_VARS)}</div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="label">Meta approval status (simulated)</span>
              <select className="field" value={draft.status} onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...draft, status: e.target.value as TemplateStatus } })}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" disabled={pending} onClick={() => run(() => saveTemplateAction(t.id, draft.body, draft.status))}>
              Save template
            </button>
          </div>
          <p className="text-xs text-slate-500">Changing an approved template&apos;s wording needs a new Meta approval once the WhatsApp Business API is connected.</p>
        </Card>
      )}
    </div>
  );
}
