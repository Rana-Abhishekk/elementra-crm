"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { FeatureBadge } from "@/components/feature-badge";
import { Card, CardHeader, Chip } from "@/components/ui";
import { mapMetaCsvRow } from "@/lib/domain/integrations/metaCsv";
import { mapSheetRow } from "@/lib/domain/integrations/sheets";
import { resolveProducts, resolveSource, type ProductRef, type SourceRef } from "@/lib/domain/masters/resolve";
import { matchLegacyStatus, type StageRef } from "@/lib/domain/stages";
import { normalisePhone } from "@/lib/domain/phone";
import { formatIST } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import { importMetaCsvAction, type ImportSummary } from "./actions";

type Kind = "META_CSV" | "LEGACY_SHEET";

/** The masters, so the preview shows the same source / product / stage the import will use. */
export interface WizardMasters {
  sources: SourceRef[];
  products: ProductRef[];
  stages: StageRef[];
  defaultPipelineId: string;
}

export function ImportWizard({ masters }: { masters: WizardMasters }) {
  const sourceName = (v: string) => resolveSource(masters.sources, v).source?.name ?? v;
  const productNames = (tokens: string[]) => resolveProducts(masters.products, tokens).ids.map((id) => masters.products.find((p) => p.id === id)!.name);
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("META_CSV");
  const [file, setFile] = useState<{ name: string; rows: Record<string, string>[]; headers: string[] } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, start] = useTransition();

  function onFile(f: File | undefined) {
    if (!f) return;
    setSummary(null);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => setFile({ name: f.name, rows: r.data, headers: r.meta.fields ?? [] }),
      error: () => toast.error("Couldn't read that file. Is it a CSV?"),
    });
  }

  function runImport() {
    if (!file) return;
    start(async () => {
      const res = await importMetaCsvAction(file.name, file.rows);
      if (!res.ok) return void toast.error(res.error);
      setSummary(res.summary);
      toast.success(`${res.summary.created} leads imported`);
      router.refresh();
    });
  }

  const preview = file?.rows.slice(0, 20) ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["META_CSV", "Meta Leads CSV export", null],
              ["LEGACY_SHEET", "Your current Sales Pipeline sheet", "F41"],
            ] as const
          ).map(([k, label, badge]) => (
            <button
              key={k}
              onClick={() => {
                setKind(k);
                setFile(null);
                setSummary(null);
              }}
              className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", kind === k ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50")}
            >
              {label} {badge && <FeatureBadge feature={badge} />}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-gold">
          <FileUp className="size-8 text-slate-400" />
          <span className="font-medium text-ink">{file ? file.name : "Choose a CSV file"}</span>
          <span className="text-xs text-slate-500">{file ? `${file.rows.length} rows · ${file.headers.length} columns` : kind === "META_CSV" ? "Leads Center → Download → CSV. Columns like id, created_time, campaign_name, full_name, phone_number…" : "Export the Sales Pipeline tab as CSV"}</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </Card>

      {file && kind === "META_CSV" && !summary && (
        <Card>
          <CardHeader
            title={`Preview — first ${preview.length} of ${file.rows.length} rows, as they will be imported`}
            action={
              <button className="btn" disabled={pending} onClick={runImport}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Import {file.rows.length} rows
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Phone</th>
                  <th className="p-2 text-left">Received</th>
                  <th className="p-2 text-left">Source</th>
                  <th className="p-2 text-left">Products</th>
                  <th className="p-2 text-left">Location text</th>
                  <th className="p-2 text-left">Campaign / ad</th>
                  <th className="p-2 text-left">Meta id</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => {
                  const m = mapMetaCsvRow(row);
                  const phone = normalisePhone(m.phone);
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2 font-medium">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="p-2">{phone ? phone.e164 : <span className="text-rose-600">invalid</span>}</td>
                      <td className="p-2 whitespace-nowrap">{m.receivedAt ? formatIST(m.receivedAt as Date) : "—"}</td>
                      <td className="p-2">{sourceName(m.source)}</td>
                      <td className="p-2">{productNames(m.products ?? []).join(", ")}</td>
                      <td className="p-2">{m.siteAddress ?? <span className="text-amber-700">none → Online Desk</span>}</td>
                      <td className="p-2 text-xs text-slate-500">
                        {m.campaignName}
                        <div>{m.adName}</div>
                      </td>
                      <td className="p-2 text-xs text-slate-500">{m.externalId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-slate-500">Meta prefixes (l:, ag:, as:, c:, f:, p:) are stripped. Times are converted from Meta&apos;s offset to IST. Imports don&apos;t send welcome messages.</p>
        </Card>
      )}

      {summary && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CheckCircle2 className="size-5 text-emerald-500" /> Import finished
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Created" value={summary.created} tone="text-emerald-700" />
            <SummaryTile label="Already imported" value={summary.duplicates} />
            <SummaryTile label="Failed" value={summary.failed} tone={summary.failed ? "text-rose-600" : undefined} />
            <SummaryTile label="Rows" value={summary.total} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Chip className="bg-emerald-50 text-emerald-700 ring-emerald-200">{summary.routed} routed to a branch</Chip>
            <Chip className="bg-amber-50 text-amber-800 ring-amber-200">{summary.needsLocation} need location</Chip>
            <Chip className="bg-rose-50 text-rose-700 ring-rose-200">{summary.outOfArea} out of area</Chip>
          </div>
          {(summary.duplicateRows.length > 0 || summary.errors.length > 0) && (
            <div className="mt-4">
              <div className="mb-1 text-sm font-medium">Duplicate report</div>
              <ul className="space-y-1 text-sm text-slate-600">
                {summary.duplicateRows.map((d) => (
                  <li key={`d${d.row}`}>
                    Row {d.row} · {d.name}: {d.note}
                  </li>
                ))}
                {summary.errors.map((e) => (
                  <li key={`e${e.row}`} className="text-rose-600">
                    Row {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard/leads?view=all" className="btn">
              See leads
            </Link>
            <button className="btn-ghost" onClick={() => { setFile(null); setSummary(null); }}>
              Import another file
            </button>
          </div>
        </Card>
      )}

      {file && kind === "LEGACY_SHEET" && <LegacyPreview headers={file.headers} rows={file.rows} masters={masters} />}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className={cn("text-2xl font-semibold", tone ?? "text-ink")}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

const SHEET_FIELDS = ["First Name", "Last Name", "Salutation", "Phone", "Email", "Site Address", "Product/Solution", "Source", "Status", "Remarks"];

function LegacyPreview({ headers, rows, masters }: { headers: string[]; rows: Record<string, string>[]; masters: WizardMasters }) {
  const mapped = SHEET_FIELDS.map((f) => ({ field: f, column: headers.find((h) => h.trim().toLowerCase() === f.toLowerCase()) ?? null }));
  return (
    <Card>
      <CardHeader title="Column mapping preview" action={<FeatureBadge feature="F41" />} />
      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <table className="w-full text-sm">
          <tbody>
            {mapped.map((m) => (
              <tr key={m.field} className="border-t border-slate-100">
                <td className="py-1.5">{m.field}</td>
                <td className="py-1.5">{m.column ? <Chip className="bg-emerald-50 text-emerald-700 ring-emerald-200">← {m.column}</Chip> : <Chip className="bg-slate-100 text-slate-500 ring-slate-200">not found</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-sm">
          <div className="mb-2 font-medium">First rows, mapped</div>
          <ul className="space-y-1 text-slate-600">
            {rows.slice(0, 5).map((r, i) => {
              const m = mapSheetRow(r);
              return (
                <li key={i}>
                  {m.firstName} {m.lastName ?? ""} · {resolveSource(masters.sources, m.source).source?.name ?? "?"} ·{" "}
                  {(m.legacyStatus && matchLegacyStatus(masters.stages, masters.defaultPipelineId, m.legacyStatus)?.label) ?? `status ? (${m.legacyStatus ?? "empty"})`}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Importing your current sheet needs agreed cleaning rules (two phones in one cell, the &quot;Handed over to&quot; column, remarks history). The mapping is ready; the import button switches on once the Rules Sheet is signed off.
          </p>
        </div>
      </div>
    </Card>
  );
}
