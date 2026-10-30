import { Check, X } from "lucide-react";
import { Card, CardHeader, Chip, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PERMISSION_GROUPS, SCOPE_HINT, SCOPE_LABEL } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/domain/time";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const me = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: { email: true, phone: true, employeeCode: true, designation: true, lastLoginAt: true, branch: { select: { name: true } }, extraBranches: { select: { name: true } }, reportsTo: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My account" description="Your role, what you can see and do, and your password." />
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Role & access" />
          <div className="space-y-4 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Chip className="bg-brand text-white ring-brand">{me.roleName}</Chip>
              <Chip>Data scope: {SCOPE_LABEL[me.scope]}</Chip>
              <span className="text-slate-500">{SCOPE_HINT[me.scope]}</span>
            </div>
            <dl className="grid grid-cols-[140px_1fr] gap-y-1.5">
              <dt className="text-slate-500">Email</dt>
              <dd>{user.email}</dd>
              <dt className="text-slate-500">Home branch</dt>
              <dd>{user.branch?.name ?? "—"}</dd>
              {user.extraBranches.length > 0 && (
                <>
                  <dt className="text-slate-500">Also covers</dt>
                  <dd>{user.extraBranches.map((b) => b.name).join(", ")}</dd>
                </>
              )}
              <dt className="text-slate-500">Designation</dt>
              <dd>{user.designation ?? "—"}</dd>
              <dt className="text-slate-500">Employee code</dt>
              <dd>{user.employeeCode ?? "—"}</dd>
              <dt className="text-slate-500">Reports to</dt>
              <dd>{user.reportsTo?.name ?? "—"}</dd>
              <dt className="text-slate-500">Last sign-in</dt>
              <dd>{user.lastLoginAt ? formatIST(user.lastLoginAt) : "—"}</dd>
            </dl>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 text-xs font-medium tracking-wider text-slate-500 uppercase">{g.group}</div>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {g.items.map((i) => {
                      const has = me.permissions.includes(i.key);
                      return (
                        <li key={i.key} className={has ? "flex items-center gap-1.5" : "flex items-center gap-1.5 text-slate-400"}>
                          {has ? <Check className="size-3.5 text-emerald-600" /> : <X className="size-3.5" />}
                          {i.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="self-start">
          <CardHeader title="Change password" />
          <div className="p-4">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
