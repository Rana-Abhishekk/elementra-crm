"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { GitBranch, Loader2, Package, Search, Store, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

/**
 * One horizontal filter bar for the kanban: search (name / phone / EL-ref), pipeline, branch, owner, product.
 * Dropdowns apply instantly; search applies after you stop typing. The pipeline choice is remembered (cookie).
 */
export function PipelineFilters({
  pipelineId,
  pipelines,
  branches,
  people,
  products,
  seesOthers,
  editHref,
}: {
  pipelineId: string;
  pipelines: Opt[];
  branches: Opt[];
  people: Opt[];
  products: Opt[];
  seesOthers: boolean;
  editHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const apply = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.set("pipeline", patch.pipeline ?? pipelineId);
    start(() => router.push(`${pathname}?${next.toString()}`));
  };

  // Debounced search
  useEffect(() => {
    if ((sp.get("q") ?? "") === q) return;
    const t = setTimeout(() => apply({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["q", "branch", "owner", "product"].filter((k) => sp.get(k)).length;

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-2 p-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or EL-ref…" className="field rounded-lg border-slate-200 bg-slate-50 py-2 pl-9 focus:bg-white" aria-label="Search the board" />
        {q && (
          <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-ink" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
      </div>
      {pipelines.length > 1 && (
        <Pill icon={GitBranch} label="Pipeline" value={pipelineId} options={pipelines} onChange={(v) => {
          document.cookie = `kanban_pipeline=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          apply({ pipeline: v });
        }} strong />
      )}
      {seesOthers && <Pill icon={Store} label="All branches" value={sp.get("branch") ?? ""} options={branches} onChange={(v) => apply({ branch: v })} />}
      {seesOthers && <Pill icon={UserRound} label="Everyone" value={sp.get("owner") ?? ""} options={people} onChange={(v) => apply({ owner: v })} />}
      <Pill icon={Package} label="All products" value={sp.get("product") ?? ""} options={products} onChange={(v) => apply({ product: v })} />
      {pending && <Loader2 className="size-4 animate-spin text-slate-400" />}
      {active > 0 && (
        <button
          onClick={() => {
            setQ("");
            apply({ q: "", branch: "", owner: "", product: "" });
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-ink"
        >
          <X className="size-3.5" /> Clear ({active})
        </button>
      )}
      {editHref && (
        <Link href={editHref} className="ml-auto rounded-lg px-2.5 py-2 text-sm text-brand hover:bg-slate-100">
          Edit stages →
        </Link>
      )}
    </div>
  );
}

function Pill({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  strong,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
  strong?: boolean;
}) {
  const on = !!value;
  return (
    <label className={cn("relative inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm", on ? "border-brand/30 bg-brand/5 text-brand" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50", strong && "font-medium")}>
      <Icon className="size-4 shrink-0" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-44 cursor-pointer appearance-none truncate bg-transparent pr-4 outline-none" aria-label={label}>
        {!strong && <option value="">{label}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 size-3 text-current opacity-60" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
