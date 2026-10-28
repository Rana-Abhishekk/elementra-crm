"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useServerAction } from "@/lib/use-action";
import { sendTemplateAction } from "../leads/actions";
import { simulateReplyAction } from "./actions";

export function InboxComposer({ leadId, language, templates, demo }: { leadId: string; language: string; templates: { code: string; language: string; name: string }[]; demo: boolean }) {
  const { pending, run } = useServerAction();
  const codes = [...new Set(templates.map((t) => t.code))];
  const [code, setCode] = useState("follow_up_nudge");
  const lang = templates.some((t) => t.code === code && t.language === language) ? language : "en";
  return (
    <div className="space-y-2 border-t border-slate-100 p-3">
      <div className="flex gap-2">
        <select className="field" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Template">
          {codes.map((c) => (
            <option key={c} value={c}>
              {templates.find((t) => t.code === c)?.name}
            </option>
          ))}
        </select>
        <button className="btn shrink-0" disabled={pending} onClick={() => run(() => sendTemplateAction(leadId, code, lang))}>
          <Send className="size-4" /> Send template
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Free-text replies open with the WhatsApp Business API (in progress). Templates work today in the simulator.</span>
        {demo && (
          <button className="btn-secondary px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => simulateReplyAction(leadId))}>
            <Sparkles className="size-3.5" /> Simulate customer reply
          </button>
        )}
      </div>
    </div>
  );
}
