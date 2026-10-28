import Link from "next/link";
import { Download, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isManager } from "@/lib/access";
import { LEAD_VIEWS, assignableUsers, branchesList, listLeads, parseLeadFilters, type LeadView } from "@/lib/data/leads";
import { getSettings } from "@/lib/data/settings";
import { isSlaBreached } from "@/lib/data/sla";
import { PageHeader, Tabs } from "@/components/ui";
import { PRODUCT_LABEL, SOURCE_LABEL } from "@/lib/domain/labels";
import { STAGE_ORDER, STAGE_SHORT, isOpenStage } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { LeadTable } from "./lead-table";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const defaultView: LeadView = user.role === "SALES_REP" || user.role === "PRESALES" ? "my" : "all";
  filters.view ??= filters.q ? "all" : defaultView;

  const [{ items, total }, settings, branches, people] = await Promise.all([listLeads(user, filters), getSettings(), branchesList(), assignableUsers()]);
  const now = new Date();
  const rows = items.map((l) => ({
    ...l,
    open: isOpenStage(l.stage),
    slaBreached: isSlaBreached(l, settings.sla.firstContactMins, settings.workingHours, now),
  }));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v])), ...patch })) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };
  const filterCount = ["stage", "branch", "owner", "source", "product", "location", "followUp", "from", "to", "returning"].filter((k) => sp[k]).length;
  const manager = isManager(user);

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${total} lead${total === 1 ? "" : "s"}${filters.q ? ` matching “${filters.q}”` : ""}`}
        actions={
          <Link href={`/api/leads/export${qs({})}`} className="btn-secondary" prefetch={false}>
            <Download className="size-4" /> Export CSV
          </Link>
        }
      />
      <Tabs active={filters.view!} tabs={LEAD_VIEWS.map((v) => ({ key: v.key, label: v.label, href: `/dashboard/leads${qs({ view: v.key, q: undefined })}` }))} />

      <details className="card mb-4" open={filterCount > 0}>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600">
          <SlidersHorizontal className="size-4" /> Filters {filterCount > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-white">{filterCount}</span>}
        </summary>
        <form className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="view" value={filters.view} />
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          <Select name="stage" label="Stage" value={sp.stage as string} options={STAGE_ORDER.map((s) => [s, STAGE_SHORT[s]])} />
          {manager && <Select name="branch" label="Branch" value={sp.branch as string} options={branches.map((b) => [b.id, shortBranch(b.name)])} />}
          {manager && <Select name="owner" label="Owner" value={sp.owner as string} options={[["none", "Unassigned"], ...people.map((p) => [p.id, p.name] as [string, string])]} />}
          <Select name="source" label="Source" value={sp.source as string} options={Object.entries(SOURCE_LABEL)} />
          <Select name="product" label="Product" value={sp.product as string} options={Object.entries(PRODUCT_LABEL)} />
          <Select name="location" label="Location" value={sp.location as string} options={[["RESOLVED", "Resolved"], ["NEEDS_LOCATION", "Needs location"], ["OUT_OF_AREA", "Out of area"]]} />
          <Select name="followUp" label="Follow-up" value={sp.followUp as string} options={[["overdue", "Overdue"], ["today", "Due today"], ["none", "No follow-up"]]} />
          <label className="text-sm">
            <span className="label">Created from</span>
            <input type="date" name="from" defaultValue={sp.from as string} className="field" />
          </label>
          <label className="text-sm">
            <span className="label">Created to</span>
            <input type="date" name="to" defaultValue={sp.to as string} className="field" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="returning" value="1" defaultChecked={sp.returning === "1"} /> Returning only
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
            <button className="btn">Apply</button>
            <Link href={`/dashboard/leads?view=${filters.view}`} className="btn-ghost">
              Clear
            </Link>
          </div>
        </form>
      </details>

      <LeadTable
        rows={rows}
        canBulkReassign={manager}
        people={people.map((p) => ({ id: p.id, name: p.name, branch: p.branch ? shortBranch(p.branch.name) : "", onLeave: p.onLeave }))}
        emptyHint={filters.view === "my" ? "Nothing open on your plate. New leads appear here as soon as they're assigned to you." : "No leads match these filters."}
      />
      {total > items.length && <p className="mt-3 text-center text-xs text-slate-500">Showing the first {items.length} of {total}. Narrow the filters to see more.</p>}
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <label className="text-sm">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="field">
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
