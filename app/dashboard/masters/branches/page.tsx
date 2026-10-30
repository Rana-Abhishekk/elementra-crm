import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { Card, Chip, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

export default async function BranchesMasterPage() {
  await requirePagePermission("branches.manage");
  const branches = await prisma.branch.findMany({
    orderBy: [{ isActive: "desc" }, { kind: "asc" }, { name: "asc" }],
    include: { _count: { select: { pincodeRules: true, users: true, leads: true, extraUsers: true } } },
  });
  return (
    <div>
      <PageHeader
        title="Branches"
        description="Experience Centres and the Online Desk. Routing reads this list on every lead: a new branch starts receiving leads in its radius immediately; a deactivated one stops."
        actions={
          <Link href="/dashboard/masters/branches/new" className="btn py-1.5">
            <Plus className="size-4" /> Add branch
          </Link>
        }
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Area</th>
              <th className="p-3 text-right">Radius</th>
              <th className="p-3">Assignment</th>
              <th className="p-3 text-right">Pincode rules</th>
              <th className="p-3 text-right">People</th>
              <th className="p-3 text-right">Leads</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className={cn("border-t border-slate-100 hover:bg-slate-50/60", !b.isActive && "text-slate-400")}>
                <td className="p-3 font-mono text-xs">{b.code}</td>
                <td className="p-3">
                  <Link href={`/dashboard/masters/branches/${b.id}`} className="font-medium text-ink hover:underline">
                    {b.name}
                  </Link>
                  {!b.isActive && <Chip className="ml-2 bg-slate-50 text-slate-400 ring-slate-200">Inactive</Chip>}
                </td>
                <td className="p-3">{b.kind === "ONLINE_DESK" ? "Online Desk" : "Experience Centre"}</td>
                <td className="p-3">{b.area ?? b.city}</td>
                <td className="p-3 text-right">{b.kind === "ONLINE_DESK" ? "—" : `${b.serviceRadiusKm} km`}</td>
                <td className="p-3">{b.assignmentStrategy === "ROUND_ROBIN" ? "Round-robin" : "Fewest open leads"}</td>
                <td className="p-3 text-right">{b._count.pincodeRules}</td>
                <td className="p-3 text-right">
                  {b._count.users}
                  {b._count.extraUsers ? <span className="text-xs text-slate-400"> +{b._count.extraUsers}</span> : null}
                </td>
                <td className="p-3 text-right">{b._count.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
