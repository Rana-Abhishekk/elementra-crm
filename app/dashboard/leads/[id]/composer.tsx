"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CallOutcome } from "@prisma/client";
import { CALL_OUTCOME_LABEL } from "@/lib/domain/labels";
import { renderTemplate, SAMPLE_VARS } from "@/lib/domain/messaging/render";
import { wallTime } from "@/lib/domain/time";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { addNoteAction, bookAppointmentAction, logCallAction, sendTemplateAction, setFollowUpAction } from "../actions";

type Tab = "note" | "call" | "whatsapp" | "visit";
const TABS: [Tab, string][] = [
  ["note", "Note"],
  ["call", "Log call"],
  ["whatsapp", "Send WhatsApp"],
  ["visit", "Book showroom visit"],
];

interface Template {
  code: string;
  language: string;
  name: string;
  status: string;
  body: string;
}

export function Composer({
  leadId,
  hasFollowUp,
  hasPhone,
  language,
  firstName,
  templates,
  branches,
  hosts,
  defaultBranchId,
  defaultHostId,
}: {
  leadId: string;
  hasFollowUp: boolean;
  hasPhone: boolean;
  language: string;
  firstName: string;
  templates: Template[];
  branches: { id: string; name: string }[];
  hosts: { id: string; name: string; branchId: string | null }[];
  defaultBranchId: string | null;
  defaultHostId: string | null;
}) {
  const { pending, run } = useServerAction();
  const [tab, setTab] = useState<Tab>("note");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome>("NO_ANSWER");
  const [tplCode, setTplCode] = useState("follow_up_nudge");
  const [tplLang, setTplLang] = useState(language);
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [hostId, setHostId] = useState(defaultHostId ?? "");
  const [when, setWhen] = useState(() => {
    const d = wallTime(new Date(), "11:00", "Asia/Kolkata", 1);
    return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 16);
  });

  // Spec §9.3: after logging something on a lead with no follow-up, nudge (non-blocking)
  const nudge = () => {
    if (hasFollowUp) return;
    toast("Set the next follow-up?", {
      action: { label: "Tomorrow 11 AM", onClick: () => run(() => setFollowUpAction(leadId, wallTime(new Date(), "11:00", "Asia/Kolkata", 1).toISOString(), "")) },
    });
  };

  const codes = [...new Set(templates.map((t) => t.code))];
  const tpl = templates.find((t) => t.code === tplCode && t.language === tplLang) ?? templates.find((t) => t.code === tplCode);
  const langs = templates.filter((t) => t.code === tplCode).map((t) => t.language);

  return (
    <div className="card">
      <div className="flex overflow-x-auto border-b border-slate-100 px-2">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cn("border-b-2 px-3 py-2.5 text-sm whitespace-nowrap", tab === key ? "border-gold font-medium text-ink" : "border-transparent text-slate-500 hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-3 p-4">
        {tab === "note" && (
          <>
            <textarea className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? e.g. 2BHK at Lokhandwala, possession in March…" />
            <button
              className="btn"
              disabled={pending || !note.trim()}
              onClick={() =>
                run(
                  () => addNoteAction(leadId, note),
                  () => {
                    setNote("");
                    nudge();
                  },
                )
              }
            >
              Add note
            </button>
          </>
        )}
        {tab === "call" && (
          <>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CALL_OUTCOME_LABEL) as CallOutcome[]).map((o) => (
                <button key={o} onClick={() => setOutcome(o)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", outcome === o ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50")}>
                  {CALL_OUTCOME_LABEL[o]}
                </button>
              ))}
            </div>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
            <button
              className="btn"
              disabled={pending}
              onClick={() =>
                run(
                  () => logCallAction(leadId, outcome, note),
                  () => {
                    setNote("");
                    nudge();
                  },
                )
              }
            >
              Log call
            </button>
          </>
        )}
        {tab === "whatsapp" && (
          <>
            {!hasPhone && <p className="text-sm text-rose-600">This lead has no phone number.</p>}
            <div className="flex gap-2">
              <select className="field" value={tplCode} onChange={(e) => setTplCode(e.target.value)}>
                {codes.map((c) => (
                  <option key={c} value={c}>
                    {templates.find((t) => t.code === c)?.name}
                  </option>
                ))}
              </select>
              <select className="field w-24" value={tplLang} onChange={(e) => setTplLang(e.target.value)}>
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {l === "hi" ? "हिन्दी" : "English"}
                  </option>
                ))}
              </select>
            </div>
            {tpl && <div className="rounded-lg bg-emerald-50 p-3 text-sm whitespace-pre-wrap text-emerald-950">{renderTemplate(tpl.body, { ...SAMPLE_VARS, name: firstName })}</div>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-teal-700">Simulator — not sent to real phones until your WhatsApp Business number is approved.</span>
              <button className="btn shrink-0" disabled={pending || !hasPhone} onClick={() => run(() => sendTemplateAction(leadId, tplCode, tplLang))}>
                Send
              </button>
            </div>
          </>
        )}
        {tab === "visit" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="label">Experience Centre</span>
                <select className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="label">Date & time (IST)</span>
                <input type="datetime-local" className="field" value={when} onChange={(e) => setWhen(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="label">Host</span>
                <select className="field" value={hostId} onChange={(e) => setHostId(e.target.value)}>
                  <option value="">—</option>
                  {hosts
                    .filter((h) => !branchId || h.branchId === branchId || h.id === defaultHostId)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <button className="btn" disabled={pending || !branchId} onClick={() => run(() => bookAppointmentAction(leadId, { branchId, hostId: hostId || null, scheduledAt: new Date(`${when}:00+05:30`) }))}>
              Book visit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
