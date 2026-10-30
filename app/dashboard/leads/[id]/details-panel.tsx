"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Pencil, Route } from "lucide-react";
import type { Priority } from "@prisma/client";
import { Card, CardHeader, Chip } from "@/components/ui";
import { PRIORITY_LABEL } from "@/lib/domain/labels";
import { formatPhone } from "@/lib/domain/phone";
import { formatIST } from "@/lib/domain/time";
import { formatINR } from "@/lib/domain/money";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { rerunRoutingAction, updateLeadDetailsAction } from "../actions";

export interface DetailsLead {
  id: string;
  salutation: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phoneE164: string | null;
  altPhoneE164: string | null;
  siteAddressRaw: string | null;
  pincode: string | null;
  localityLabel: string | null;
  products: string[]; // product ids
  sourceId: string;
  priority: Priority;
  language: string;
  possessionDate: Date | null;
  budgetNote: string | null;
  estimatedValueInr: number | null;
  orderValueInr: number | null;
  architectId: string | null;
  architectCommissionPct: number | null;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  formName: string | null;
  platform: string | null;
  contactId: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

type MasterOption = { id: string; name: string; isActive: boolean };

export function DetailsPanel({
  lead,
  architects,
  products,
  sources,
  editable,
  valueLabel,
}: {
  lead: DetailsLead;
  architects: { id: string; label: string }[];
  products: MasterOption[];
  sources: MasterOption[];
  editable: boolean;
  valueLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [locating, setLocating] = useState(false);
  const { pending, run } = useServerAction();
  const [f, setF] = useState({
    salutation: lead.salutation ?? "",
    firstName: lead.firstName,
    lastName: lead.lastName ?? "",
    email: lead.email ?? "",
    phone: lead.phoneE164 ?? "",
    altPhoneE164: lead.altPhoneE164 ?? "",
    products: lead.products,
    sourceId: lead.sourceId,
    priority: lead.priority,
    language: lead.language as "en" | "hi",
    possessionDate: lead.possessionDate ? lead.possessionDate.toISOString().slice(0, 10) : "",
    budgetNote: lead.budgetNote ?? "",
    estimatedValueInr: lead.estimatedValueInr?.toString() ?? "",
    orderValueInr: lead.orderValueInr?.toString() ?? "",
    architectId: lead.architectId ?? "",
    architectCommissionPct: lead.architectCommissionPct?.toString() ?? "",
  });
  const [addr, setAddr] = useState({ siteAddress: lead.siteAddressRaw ?? "", pincode: lead.pincode ?? "" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const architect = architects.find((a) => a.id === lead.architectId);

  function save() {
    run(
      () =>
        updateLeadDetailsAction(lead.id, {
          ...f,
          salutation: f.salutation || null,
          lastName: f.lastName || null,
          email: f.email || null,
          phone: f.phone || null,
          altPhoneE164: f.altPhoneE164 || null,
          possessionDate: f.possessionDate ? new Date(`${f.possessionDate}T00:00:00+05:30`) : null,
          budgetNote: f.budgetNote || null,
          estimatedValueInr: f.estimatedValueInr ? Number(f.estimatedValueInr) : null,
          orderValueInr: f.orderValueInr ? Number(f.orderValueInr) : null,
          architectId: f.architectId || null,
          architectCommissionPct: f.architectCommissionPct ? Number(f.architectCommissionPct) : null,
        }),
      () => setEditing(false),
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Customer & requirement"
          action={
            editable && !editing ? (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-ink">
                <Pencil className="size-3.5" /> Edit
              </button>
            ) : null
          }
        />
        {!editing ? (
          <dl className="divide-y divide-slate-50 px-4 py-2">
            <Row label="Phone">{lead.phoneE164 ? formatPhone(lead.phoneE164) : null}</Row>
            {lead.altPhoneE164 && <Row label="Alt. phone">{formatPhone(lead.altPhoneE164)}</Row>}
            <Row label="Email">{lead.email}</Row>
            <Row label="Products">
              {lead.products.length ? (
                <span className="flex flex-wrap gap-1">
                  {lead.products.map((id) => {
                    const p = products.find((x) => x.id === id);
                    return (
                      <Chip key={id} className={p?.isActive === false ? "bg-slate-50 text-slate-400 ring-slate-200" : undefined}>
                        {p?.name ?? "—"}
                        {p?.isActive === false ? " (inactive)" : ""}
                      </Chip>
                    );
                  })}
                </span>
              ) : null}
            </Row>
            <Row label="Possession">{lead.possessionDate ? formatIST(lead.possessionDate, "MMM yyyy") : null}</Row>
            <Row label="Budget">{lead.budgetNote}</Row>
            <Row label="Value">{valueLabel !== "—" ? valueLabel : null}</Row>
            <Row label="Architect">{architect ? `${architect.label}${lead.architectCommissionPct ? ` · ${lead.architectCommissionPct}%` : ""}` : null}</Row>
            <Row label="Language">{lead.language === "hi" ? "Hindi" : "English"}</Row>
            {lead.contactId && (
              <Row label="Contact">
                <Link className="text-brand underline" href="/dashboard/contacts">
                  Customer record
                </Link>
              </Row>
            )}
          </dl>
        ) : (
          <div className="space-y-3 p-4 text-sm">
            <div className="grid grid-cols-[70px_1fr_1fr] gap-2">
              <input className="field" placeholder="Mr/Ms" value={f.salutation} onChange={(e) => set("salutation", e.target.value)} />
              <input className="field" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />
              <input className="field" placeholder="Last name" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
            <input className="field" placeholder="Email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            <input className="field" placeholder="Phone (+91…)" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            <input className="field" placeholder="Alternate phone (+91…)" value={f.altPhoneE164} onChange={(e) => set("altPhoneE164", e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set("products", f.products.includes(p.id) ? f.products.filter((x) => x !== p.id) : [...f.products, p.id])}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", f.products.includes(p.id) ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600")}
                >
                  {p.name}
                  {p.isActive ? "" : " (inactive)"}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="label">Source</span>
              <select className="field" value={f.sourceId} onChange={(e) => set("sourceId", e.target.value)}>
                {sources.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                    {x.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="label">Priority</span>
                <select className="field" value={f.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                  {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Message language</span>
                <select className="field" value={f.language} onChange={(e) => set("language", e.target.value as "en" | "hi")}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
              <label>
                <span className="label">Possession</span>
                <input type="date" className="field" value={f.possessionDate} onChange={(e) => set("possessionDate", e.target.value)} />
              </label>
              <label>
                <span className="label">Budget note</span>
                <input className="field" value={f.budgetNote} onChange={(e) => set("budgetNote", e.target.value)} />
              </label>
              <label>
                <span className="label">Estimated value ₹</span>
                <input className="field" inputMode="numeric" value={f.estimatedValueInr} onChange={(e) => set("estimatedValueInr", e.target.value.replace(/\D/g, ""))} />
              </label>
              <label>
                <span className="label">Order value ₹</span>
                <input className="field" inputMode="numeric" value={f.orderValueInr} onChange={(e) => set("orderValueInr", e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <label>
                <span className="label">Architect</span>
                <select className="field" value={f.architectId} onChange={(e) => set("architectId", e.target.value)}>
                  <option value="">None</option>
                  {architects.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Comm. %</span>
                <input className="field" inputMode="decimal" value={f.architectCommissionPct} onChange={(e) => set("architectCommissionPct", e.target.value)} />
              </label>
            </div>
            {f.orderValueInr && <p className="text-xs text-slate-500">Order value: {formatINR(Number(f.orderValueInr))}</p>}
            <div className="flex gap-2">
              <button className="btn" disabled={pending} onClick={save}>
                Save
              </button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-slate-400" /> Site</span>}
          action={
            editable && !locating ? (
              <button onClick={() => setLocating(true)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-ink">
                <Pencil className="size-3.5" /> Change
              </button>
            ) : null
          }
        />
        {!locating ? (
          <dl className="px-4 py-2">
            <Row label="Address">{lead.siteAddressRaw}</Row>
            <Row label="Pincode">{lead.pincode}</Row>
            <Row label="Understood as">{lead.localityLabel}</Row>
          </dl>
        ) : (
          <div className="space-y-2 p-4">
            <input className="field" placeholder="Area / society / address" value={addr.siteAddress} onChange={(e) => setAddr({ ...addr, siteAddress: e.target.value })} />
            <input className="field" placeholder="Pincode" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} />
            <div className="flex gap-2">
              <button className="btn" disabled={pending} onClick={() => run(() => rerunRoutingAction(lead.id, addr.siteAddress, addr.pincode), () => setLocating(false))}>
                <Route className="size-4" /> Save & re-run routing
              </button>
              <button className="btn-ghost" onClick={() => setLocating(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      {(lead.campaignName || lead.adName || lead.formName) && (
        <Card>
          <CardHeader title="Source attribution" />
          <dl className="px-4 py-2">
            <Row label="Campaign">{lead.campaignName}</Row>
            <Row label="Ad set">{lead.adsetName}</Row>
            <Row label="Ad">{lead.adName}</Row>
            <Row label="Form">{lead.formName}</Row>
            <Row label="Platform">{lead.platform === "fb" ? "Facebook" : lead.platform === "ig" ? "Instagram" : lead.platform}</Row>
          </dl>
        </Card>
      )}
    </>
  );
}
