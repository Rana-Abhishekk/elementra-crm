"use client";

import { useRouter } from "next/navigation";

/** Kanban pipeline switcher; the choice is remembered in a cookie for this browser. */
export function PipelineSwitcher({ value, pipelines }: { value: string; pipelines: { id: string; name: string }[] }) {
  const router = useRouter();
  return (
    <select
      aria-label="Pipeline"
      value={value}
      onChange={(e) => {
        document.cookie = `kanban_pipeline=${e.target.value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        router.push(`/dashboard/pipeline?pipeline=${e.target.value}`);
      }}
      className="field w-auto py-1.5 font-medium"
    >
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
