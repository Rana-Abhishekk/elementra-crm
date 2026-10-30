import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { formatIST } from "@/lib/domain/time";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePagePermission("audit.view");
  const sp = await searchParams;
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.actor ? { actorId: sp.actor === "system" ? null : sp.actor } : {}),
    ...(sp.action ? { action: { startsWith: sp.action } } : {}),
    ...(sp.entity ? { entityType: sp.entity } : {}),
    ...(sp.q ? { summary: { contains: sp.q, mode: "insensitive" } } : {}),
  };
  const [rows, actors, actions] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  const groups = [...new Set(actions.map((a) => a.action.split(".")[0]))];
  const href = (r: (typeof rows)[number]) =>
    r.entityType === "Lead" ? `/dashboard/leads/${r.entityId}` : r.entityType === "User" ? "/dashboard/team" : r.entityType === "Setting" || r.entityType === "BranchPincode" || r.entityType === "Branch" || r.entityType === "MessageTemplate" ? "/dashboard/settings" : r.entityType === "ImportJob" ? "/dashboard/imports" : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audit log" description="Who changed what, and when. Automatic decisions are on each lead's timeline; people's changes are here." />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-5">
        <select name="actor" defaultValue={sp.actor ?? ""} className="field">
          <option value="">Anyone</option>
          <option value="system">System</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select name="action" defaultValue={sp.action ?? ""} className="field">
          <option value="">Any action</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select name="entity" defaultValue={sp.entity ?? ""} className="field">
          <option value="">Any record</option>
          {["Lead", "User", "Setting", "Branch", "BranchPincode", "MessageTemplate", "ImportJob"].map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={sp.q} placeholder="Search summary" className="field" />
        <button className="btn">Filter</button>
      </form>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="p-3 text-left">When</th>
              <th className="p-3 text-left">Who</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">What changed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const link = href(r);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 whitespace-nowrap text-slate-500">{formatIST(r.createdAt)}</td>
                  <td className="p-3">{r.actor?.name ?? <span className="text-slate-400">System</span>}</td>
                  <td className="p-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{r.action}</code>
                  </td>
                  <td className="p-3">{link ? <Link href={link} className="hover:underline">{r.summary}</Link> : r.summary}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  Nothing matches. Changes to leads, settings and the team appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
