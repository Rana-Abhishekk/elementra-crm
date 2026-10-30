"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { AssignmentStrategy } from "@prisma/client";
import { Card, CardHeader } from "@/components/ui";
import { FeatureBadge } from "@/components/feature-badge";
import type { Settings } from "@/lib/domain/settings";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { addPincodeRuleAction, removePincodeRuleAction, saveBranchAction, saveSettingsAction } from "./actions";

function Radio<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; hint?: string; disabled?: boolean; badge?: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o.value} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", value === o.value ? "border-brand bg-slate-50" : "border-slate-200", o.disabled && "cursor-not-allowed opacity-60")}>
          <input type="radio" className="mt-1" checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
          <span>
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              {o.label} {o.badge}
            </span>
            {o.hint && <span className="block text-xs text-slate-500">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function RoutingSettings({
  settings,
  googleKey,
  branches,
  rules,
}: {
  settings: Settings;
  googleKey: boolean;
  branches: { id: string; name: string; radius: number; strategy: AssignmentStrategy }[];
  rules: { id: string; pincode: string; label: string | null; branch: string }[];
}) {
  const { pending, run } = useServerAction();
  const [routing, setRouting] = useState(settings.routing);
  const [b, setB] = useState(Object.fromEntries(branches.map((x) => [x.id, { radius: String(x.radius), strategy: x.strategy }])));
  const [pin, setPin] = useState({ pincode: "", label: "", branchId: branches[0]?.id ?? "" });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Routing mode" />
        <div className="space-y-4 p-4">
          <Radio
            value={routing.mode}
            onChange={(mode) => setRouting({ ...routing, mode })}
            options={[
              { value: "DIRECT", label: "Direct to the branch", hint: "When the location is known, the lead goes straight to the nearest Experience Centre. The Online Desk handles leads without a location." },
              { value: "VIA_PRESALES", label: "Via the Online Desk", hint: "Every lead goes to the Online Desk first. The branch is suggested and the handover happens when they qualify the lead." },
            ]}
          />
          <div>
            <div className="label">Area check, in this order</div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Pincode rules (below) — always win over distance</li>
              <li>Locality map with spelling-tolerant matching + km radius per branch</li>
              <li className={googleKey ? "" : "text-slate-400"}>
                Google Maps geocoding {googleKey ? "(active)" : "(awaiting your API key)"} <FeatureBadge feature="F9" />
              </li>
            </ol>
          </div>
          <div>
            <div className="label">Out-of-area leads</div>
            <Radio
              value={routing.outOfAreaAction}
              onChange={(outOfAreaAction) => setRouting({ ...routing, outOfAreaAction })}
              options={[
                { value: "MANAGER_QUEUE", label: "Manager decides", hint: "Parked in the Out-of-area queue; accept, regret or close in one click." },
                { value: "AUTO_REGRET", label: "Polite auto-message", hint: "Send the out-of-area regret on WhatsApp and close as Lost – Others." },
                { value: "ASSIGN_LOW_PRIORITY", label: "Assign as low priority", hint: "Give it to the nearest branch with priority Cold." },
              ]}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-500">
            <input type="checkbox" disabled checked={routing.productRuleEnabled} readOnly /> Product-based assignment (e.g. wardrobes → a specialist) <FeatureBadge feature="F40" />
          </label>
          <button className="btn" disabled={pending} onClick={() => run(() => saveSettingsAction("routing", routing))}>
            Save routing
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Experience Centres" />
        <div className="divide-y divide-slate-100">
          {branches.map((br) => (
            <div key={br.id} className="flex flex-wrap items-end gap-3 px-4 py-3">
              <div className="w-28 font-medium">{br.name}</div>
              <label className="text-sm">
                <span className="label">Radius (km)</span>
                <input className="field w-24" inputMode="numeric" value={b[br.id].radius} onChange={(e) => setB({ ...b, [br.id]: { ...b[br.id], radius: e.target.value } })} />
              </label>
              <label className="text-sm">
                <span className="label">Assignment</span>
                <select className="field" value={b[br.id].strategy} onChange={(e) => setB({ ...b, [br.id]: { ...b[br.id], strategy: e.target.value as AssignmentStrategy } })}>
                  <option value="ROUND_ROBIN">Turn by turn (round-robin)</option>
                  <option value="LEAST_OPEN_LEADS">Fewest open leads</option>
                </select>
              </label>
              <button className="btn-secondary" disabled={pending} onClick={() => run(() => saveBranchAction(br.id, { serviceRadiusKm: Number(b[br.id].radius), assignmentStrategy: b[br.id].strategy }))}>
                Save
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Pincode rules — these win over distance" />
        <table className="w-full text-sm">
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="p-3 font-mono">{r.pincode}</td>
                <td className="p-3 text-slate-600">{r.label}</td>
                <td className="p-3">→ {r.branch}</td>
                <td className="p-3 text-right">
                  <button className="text-slate-400 hover:text-rose-600" disabled={pending} onClick={() => run(() => removePincodeRuleAction(r.id))} aria-label={`Remove ${r.pincode}`}>
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end gap-2 p-4">
          <input className="field w-28" placeholder="Pincode" value={pin.pincode} onChange={(e) => setPin({ ...pin, pincode: e.target.value })} />
          <input className="field w-40" placeholder="Area (optional)" value={pin.label} onChange={(e) => setPin({ ...pin, label: e.target.value })} />
          <select className="field w-36" value={pin.branchId} onChange={(e) => setPin({ ...pin, branchId: e.target.value })}>
            {branches.map((br) => (
              <option key={br.id} value={br.id}>
                {br.name}
              </option>
            ))}
          </select>
          <button className="btn" disabled={pending} onClick={() => run(() => addPincodeRuleAction(pin.pincode, pin.branchId, pin.label), () => setPin({ ...pin, pincode: "", label: "" }))}>
            Add rule
          </button>
        </div>
      </Card>
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HoursSettings({ settings }: { settings: Settings }) {
  const { pending, run } = useServerAction();
  const [wh, setWh] = useState(settings.workingHours);
  const [sla, setSla] = useState({ first: String(settings.sla.firstContactMins), esc: String(settings.sla.escalateMins) });
  const [apptH, setApptH] = useState(String(settings.reminders.appointmentHours));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Working hours (IST)" />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setWh({ ...wh, days: wh.days.includes(i) ? wh.days.filter((x) => x !== i) : [...wh.days, i].sort() })}
                className={cn("rounded-full border px-3 py-1.5 text-sm", wh.days.includes(i) ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-500")}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <label className="text-sm">
              <span className="label">Open</span>
              <input type="time" className="field" value={wh.open} onChange={(e) => setWh({ ...wh, open: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="label">Close</span>
              <input type="time" className="field" value={wh.close} onChange={(e) => setWh({ ...wh, close: e.target.value })} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Night leads get the WhatsApp welcome at once; their first call is due after opening.</p>
          <button className="btn" disabled={pending} onClick={() => run(() => saveSettingsAction("workingHours", wh))}>
            Save hours
          </button>
        </div>
      </Card>
      <Card>
        <CardHeader title="First-call promise (SLA)" action={<Link href="/dashboard/automations" className="text-xs text-brand hover:underline">Automations →</Link>} />
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm">
            <span className="label">Call within (working minutes)</span>
            <input className="field w-32" inputMode="numeric" value={sla.first} onChange={(e) => setSla({ ...sla, first: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="label">Escalate to manager after</span>
            <input className="field w-32" inputMode="numeric" value={sla.esc} onChange={(e) => setSla({ ...sla, esc: e.target.value })} />
          </label>
          <button className="btn" disabled={pending} onClick={() => run(() => saveSettingsAction("sla", { firstContactMins: Number(sla.first), escalateMins: Number(sla.esc) }))}>
            Save SLA
          </button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Reminders" />
        <div className="space-y-4 p-4">
          <p className="text-sm text-slate-600">
            &ldquo;No activity for N days&rdquo; nudges are set per stage in{" "}
            <Link href="/dashboard/masters/pipelines" className="text-brand hover:underline">
              Masters → Pipelines &amp; Statuses
            </Link>
            .
          </p>
          <label className="block text-sm">
            <span className="label">Showroom visit reminder (hours before)</span>
            <input className="field w-24" inputMode="numeric" value={apptH} onChange={(e) => setApptH(e.target.value)} />
          </label>
          <button
            className="btn"
            disabled={pending}
            onClick={() => run(() => saveSettingsAction("reminders", { appointmentHours: Number(apptH) }))}
          >
            Save reminders
          </button>
        </div>
      </Card>
    </div>
  );
}

export function DuplicateSettings({ settings }: { settings: Settings }) {
  const { pending, run } = useServerAction();
  const [d, setD] = useState({ windowDays: String(settings.duplicates.windowDays) });
  return (
    <Card>
      <CardHeader title="Same phone number enquires again" />
      <div className="space-y-4 p-4 text-sm text-slate-600">
        <p>
          <strong className="text-ink">The phone number is the customer&apos;s key.</strong> The database allows only one open lead per number, so the same
          person can&apos;t be entered twice:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A Meta / website / WhatsApp / CSV enquiry from a number that already has an open lead is added to that lead&apos;s timeline. Same owner, no new lead; the owner is notified.</li>
          <li>Someone typing the number on the New lead form is sent to the existing lead (or told it exists in another branch).</li>
          <li>If the earlier lead is closed (won or lost), a new lead is created and marked &ldquo;Returning customer&rdquo;.</li>
        </ul>
        <label className="block text-sm">
          <span className="label">Mark as returning customer if the earlier enquiry is within (days)</span>
          <input className="field w-24" inputMode="numeric" value={d.windowDays} onChange={(e) => setD({ ...d, windowDays: e.target.value })} />
        </label>
        <button className="btn" disabled={pending} onClick={() => run(() => saveSettingsAction("duplicates", { windowDays: Number(d.windowDays) }))}>
          Save
        </button>
      </div>
    </Card>
  );
}
