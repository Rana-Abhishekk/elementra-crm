import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { BranchForm, PincodeRules } from "./branch-form";

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("branches.manage");
  const { id } = await params;
  const branch =
    id === "new"
      ? null
      : await prisma.branch.findUnique({
          where: { id },
          include: {
            pincodeRules: { orderBy: { pincode: "asc" } },
            users: { where: { isActive: true }, select: { id: true, name: true, role: { select: { name: true } } }, orderBy: { name: "asc" } },
            extraUsers: { where: { isActive: true }, select: { id: true, name: true, role: { select: { name: true } } }, orderBy: { name: "asc" } },
          },
        });
  if (id !== "new" && !branch) notFound();

  return (
    <div>
      <Link href="/dashboard/masters/branches" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="size-4" /> Branches
      </Link>
      <PageHeader title={branch ? branch.name : "New branch"} description={branch ? `${branch.code} · ${branch.city}` : "Click the map to set the showroom's pin; the dashed circle is the service radius."} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <BranchForm
          branch={
            branch
              ? { id: branch.id, code: branch.code, name: branch.name, kind: branch.kind, city: branch.city, area: branch.area, lat: branch.lat, lng: branch.lng, serviceRadiusKm: branch.serviceRadiusKm, assignmentStrategy: branch.assignmentStrategy, isActive: branch.isActive }
              : null
          }
        />
        {branch && (
          <div className="space-y-6">
            <PincodeRules branchId={branch.id} rules={branch.pincodeRules.map((r) => ({ id: r.id, pincode: r.pincode, label: r.label }))} />
            <Card>
              <CardHeader title="People" action={<Link href={`/dashboard/masters/users?branch=${branch.id}`} className="text-xs text-brand hover:underline">Users →</Link>} />
              <ul className="divide-y divide-slate-100 text-sm">
                {branch.users.map((u) => (
                  <li key={u.id} className="flex justify-between px-4 py-2">
                    <span>{u.name}</span>
                    <span className="text-xs text-slate-500">{u.role.name}</span>
                  </li>
                ))}
                {branch.extraUsers.map((u) => (
                  <li key={u.id} className="flex justify-between px-4 py-2">
                    <span>{u.name}</span>
                    <span className="text-xs text-slate-500">{u.role.name} · also covers</span>
                  </li>
                ))}
                {!branch.users.length && !branch.extraUsers.length && <li className="px-4 py-3 text-slate-500">Nobody yet.</li>}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
