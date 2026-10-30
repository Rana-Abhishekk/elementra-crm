"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Pencil, Plus, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Card, Chip, EmptyState } from "@/components/ui";
import { formatIST } from "@/lib/domain/time";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { deactivateUserAction, reactivateUserAction, saveUserAction, setTempPasswordAction } from "./actions";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  employeeCode: string | null;
  designation: string | null;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  branchId: string | null;
  branchName: string | null;
  extraBranches: { id: string; name: string }[];
  reportsTo: { id: string; name: string } | null;
  receivesLeads: boolean;
  onLeave: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  openLeads: number;
  openTasks: number;
}

type RoleOption = { id: string; name: string; users: number; assignable: boolean; reason: string | null };
type Branch = { id: string; name: string };

const short = (n: string) => n.replace(" Experience Centre", "");

export function UsersMaster({
  users,
  roles,
  branches,
  canManage,
  actorId,
  filters,
}: {
  users: UserRow[];
  roles: RoleOption[];
  branches: Branch[];
  canManage: boolean;
  actorId: string;
  filters: { branch: string; role: string; status: string; q: string };
}) {
  const { pending, run } = useServerAction();
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<UserRow | null>(null);

  return (
    <>
      <form className="mb-3 flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={filters.q} placeholder="Name, email or code…" className="field w-48 py-1.5" />
        <select name="branch" defaultValue={filters.branch} className="field w-auto py-1.5">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {short(b.name)}
            </option>
          ))}
        </select>
        <select name="role" defaultValue={filters.role} className="field w-auto py-1.5">
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status} className="field w-auto py-1.5">
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
          <option value="all">All</option>
        </select>
        <button className="btn-secondary py-1.5">Filter</button>
        {canManage && (
          <button type="button" className="btn ml-auto py-1.5" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add user
          </button>
        )}
      </form>
      <Card className="overflow-x-auto">
        {users.length === 0 ? (
          <EmptyState title="Nobody matches these filters" />
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Branches</th>
                <th className="p-3">Reports to</th>
                <th className="p-3">Leads</th>
                <th className="p-3 text-right">Open leads</th>
                <th className="p-3">Last sign-in</th>
                {canManage && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={cn("border-t border-slate-100", !u.isActive && "text-slate-400")}>
                  <td className="p-3">
                    <div className="font-medium text-ink">{u.name}</div>
                    <div className="text-xs text-slate-500">
                      {u.email}
                      {u.employeeCode ? ` · ${u.employeeCode}` : ""}
                      {u.designation ? ` · ${u.designation}` : ""}
                    </div>
                  </td>
                  <td className="p-3">
                    <Chip className={u.isSuperAdmin ? "bg-brand text-white ring-brand" : undefined}>{u.roleName}</Chip>
                    {!u.isActive && <Chip className="ml-1 bg-slate-50 text-slate-400 ring-slate-200">Deactivated</Chip>}
                    {u.mustChangePassword && u.isActive && <Chip className="ml-1 bg-amber-50 text-amber-800 ring-amber-200">Temp password</Chip>}
                  </td>
                  <td className="p-3 text-xs">
                    <div>{u.branchName ? short(u.branchName) : "—"}</div>
                    {u.extraBranches.length > 0 && <div className="text-slate-500">+ {u.extraBranches.map((b) => short(b.name)).join(", ")}</div>}
                  </td>
                  <td className="p-3 text-xs">{u.reportsTo?.name ?? "—"}</td>
                  <td className="p-3 text-xs">{u.receivesLeads ? (u.onLeave ? "On leave" : "Receives") : "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    <Link href={`/dashboard/leads?view=all&owner=${u.id}`} className="hover:underline">
                      {u.openLeads}
                    </Link>
                  </td>
                  <td className="p-3 text-xs">{u.lastLoginAt ? formatIST(u.lastLoginAt, "d MMM, h:mm a") : "Never"}</td>
                  {canManage && (
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(u)} className="btn-ghost px-2 py-1" title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        {u.id !== actorId && u.isActive && (
                          <button
                            className="btn-ghost px-2 py-1"
                            title="Set a temporary password"
                            disabled={pending}
                            onClick={() =>
                              window.confirm(`Set a new temporary password for ${u.name}? They'll pick their own at next sign-in.`) &&
                              run(
                                () => setTempPasswordAction(u.id),
                                (res) => res.message && toast.message(res.message, { duration: 20000 }),
                              )
                            }
                          >
                            <KeyRound className="size-3.5" />
                          </button>
                        )}
                        {u.id !== actorId &&
                          (u.isActive ? (
                            <button className="btn-ghost px-2 py-1 text-rose-600" title="Deactivate" onClick={() => setDeactivating(u)}>
                              <UserX className="size-3.5" />
                            </button>
                          ) : (
                            <button className="btn-ghost px-2 py-1 text-emerald-700" title="Reactivate" disabled={pending} onClick={() => run(() => reactivateUserAction(u.id))}>
                              <UserCheck className="size-3.5" />
                            </button>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing && <UserModal user={editing === "new" ? null : editing} roles={roles} branches={branches} people={users.filter((u) => u.isActive)} actorId={actorId} onClose={() => setEditing(null)} />}
      {deactivating && <DeactivateModal user={deactivating} people={users.filter((u) => u.isActive && u.id !== deactivating.id && u.receivesLeads)} onClose={() => setDeactivating(null)} />}
    </>
  );
}

function UserModal({ user, roles, branches, people, actorId, onClose }: { user: UserRow | null; roles: RoleOption[]; branches: Branch[]; people: UserRow[]; actorId: string; onClose: () => void }) {
  const { pending, run } = useServerAction();
  const self = user?.id === actorId;
  const [f, setF] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    employeeCode: user?.employeeCode ?? "",
    designation: user?.designation ?? "",
    roleId: user?.roleId ?? roles.find((r) => r.assignable)?.id ?? "",
    branchId: user?.branchId ?? branches[0]?.id ?? "",
    extraBranchIds: user?.extraBranches.map((b) => b.id) ?? [],
    reportsToId: user?.reportsTo?.id ?? "",
    receivesLeads: user?.receivesLeads ?? true,
    password: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function save() {
    run(
      () => saveUserAction(user?.id ?? null, { ...f, branchId: f.branchId || null, reportsToId: f.reportsToId || null, password: f.password || undefined }),
      (res) => {
        if (!user && res.message) toast.message(res.message, { duration: 20000 });
        onClose();
      },
    );
  }

  return (
    <Modal open onClose={onClose} title={user ? `Edit ${user.name}` : "New user"} wide>
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <label>
          <span className="label">Full name</span>
          <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </label>
        <label>
          <span className="label">Work email (sign-in)</span>
          <input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label>
          <span className="label">Phone</span>
          <input className="field" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+9190000…" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Employee code</span>
            <input className="field" value={f.employeeCode} onChange={(e) => set("employeeCode", e.target.value)} />
          </label>
          <label>
            <span className="label">Designation</span>
            <input className="field" value={f.designation} onChange={(e) => set("designation", e.target.value)} />
          </label>
        </div>
        <label>
          <span className="label">Role</span>
          <select className="field" value={f.roleId} disabled={self} onChange={(e) => set("roleId", e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.assignable && r.id !== user?.roleId}>
                {r.name}
                {!r.assignable ? " (beyond your access)" : ""}
              </option>
            ))}
          </select>
          {self && <span className="mt-1 block text-xs text-slate-500">You can&apos;t change your own role.</span>}
        </label>
        <label>
          <span className="label">Home branch (leads are assigned here)</span>
          <select className="field" value={f.branchId} onChange={(e) => set("branchId", e.target.value)}>
            <option value="">— none —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {short(b.name)}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <span className="label">Also covers (managers over several branches)</span>
          <div className="flex flex-wrap gap-1.5">
            {branches
              .filter((b) => b.id !== f.branchId)
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => set("extraBranchIds", f.extraBranchIds.includes(b.id) ? f.extraBranchIds.filter((x) => x !== b.id) : [...f.extraBranchIds, b.id])}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", f.extraBranchIds.includes(b.id) ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600")}
                >
                  {short(b.name)}
                </button>
              ))}
          </div>
        </div>
        <label>
          <span className="label">Reports to</span>
          <select className="field" value={f.reportsToId} onChange={(e) => set("reportsToId", e.target.value)}>
            <option value="">— nobody —</option>
            {people
              .filter((p) => p.id !== user?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.roleName}
                </option>
              ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" checked={f.receivesLeads} onChange={(e) => set("receivesLeads", e.target.checked)} /> Receives new leads (round-robin)
        </label>
        {!user && (
          <label className="sm:col-span-2">
            <span className="label">Temporary password (leave empty to generate one)</span>
            <input className="field" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="Generated if empty" />
            <span className="mt-1 block text-xs text-slate-500">They&apos;ll be asked to choose their own at first sign-in.</span>
          </label>
        )}
        <div className="sm:col-span-2">
          <button className="btn w-full" disabled={pending || !f.name.trim() || !f.email.trim()} onClick={save}>
            {pending ? "Saving…" : user ? "Save" : "Create user"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeactivateModal({ user, people, onClose }: { user: UserRow; people: UserRow[]; onClose: () => void }) {
  const { pending, run } = useServerAction();
  const [mode, setMode] = useState<"auto" | "user">("auto");
  const [to, setTo] = useState(people.find((p) => p.branchId === user.branchId)?.id ?? people[0]?.id ?? "");
  return (
    <Modal open onClose={onClose} title={`Deactivate ${user.name}`}>
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          {user.name} has <strong>{user.openLeads} open lead{user.openLeads === 1 ? "" : "s"}</strong> and <strong>{user.openTasks} open task{user.openTasks === 1 ? "" : "s"}</strong>. Hand them over first:
        </p>
        <label className="flex items-start gap-2">
          <input type="radio" checked={mode === "auto"} onChange={() => setMode("auto")} className="mt-1" />
          <span>
            Auto-distribute in each lead&apos;s branch
            <span className="block text-xs text-slate-500">Round-robin / fewest open leads, skipping people on leave — like a new lead.</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" checked={mode === "user"} onChange={() => setMode("user")} className="mt-1" />
          <span className="flex-1">
            Give everything to one person
            <select className="field mt-1" value={to} disabled={mode !== "user"} onChange={(e) => setTo(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.branchName ? short(p.branchName) : "—"}
                </option>
              ))}
            </select>
          </span>
        </label>
        <p className="text-xs text-slate-500">They&apos;re signed out on their next click. History, audit entries and closed leads keep their name.</p>
        <button className="btn w-full bg-rose-600 hover:bg-rose-700" disabled={pending || (mode === "user" && !to)} onClick={() => run(() => deactivateUserAction(user.id, { mode, toUserId: mode === "user" ? to : null }), onClose)}>
          {pending ? "Working…" : `Reassign and deactivate`}
        </button>
      </div>
    </Modal>
  );
}
