"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import type { DataScope } from "@prisma/client";
import { Modal } from "@/components/modal";
import { Card, CardHeader, Chip } from "@/components/ui";
import { PERMISSION_GROUPS, PERMISSION_LABEL, SCOPE_HINT, SCOPE_LABEL, SCOPE_ORDER, type Permission } from "@/lib/auth/permissions";
import { useServerAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { cloneRoleAction, deleteRoleAction, saveRoleAction } from "./actions";

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  scope: DataScope;
  permissions: string[];
  isSystem: boolean;
  isLocked: boolean;
  users: number;
}

interface Preview {
  userId: string;
  name: string;
  roleName: string;
  scope: DataScope;
  leads: number;
  openLeads: number;
  users: number;
  branches: string[];
  permissions: string[];
}

export function RolesEditor({
  roles,
  actorPermissions,
  actorScope,
  people,
  preview,
}: {
  roles: RoleRow[];
  actorPermissions: string[];
  actorScope: DataScope;
  people: { id: string; name: string }[];
  preview: Preview | null;
}) {
  const router = useRouter();
  const { pending, run } = useServerAction();
  const [editing, setEditing] = useState<RoleRow | "new" | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex justify-end">
          <button className="btn py-1.5" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> New role
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-ink">{r.name}</span>
                    {r.isLocked && (
                      <Chip className="bg-brand text-white ring-brand">
                        <Lock className="size-3" /> Locked
                      </Chip>
                    )}
                    {r.isSystem && !r.isLocked && <Chip>Built-in</Chip>}
                  </div>
                  {r.description && <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <Chip className="bg-sky-50 text-sky-700 ring-sky-200">Sees: {SCOPE_LABEL[r.scope]}</Chip>
                <Chip>{r.permissions.length} permissions</Chip>
                <Chip>
                  {r.users} user{r.users === 1 ? "" : "s"}
                </Chip>
              </div>
              <div className="mt-auto flex gap-1 pt-3">
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(r)}>
                  {r.isLocked ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />} {r.isLocked ? "View" : "Edit"}
                </button>
                <button className="btn-ghost px-2 py-1 text-xs" disabled={pending} onClick={() => run(() => cloneRoleAction(r.id))}>
                  <Copy className="size-3.5" /> Clone
                </button>
                {!r.isSystem && (
                  <button className="btn-ghost px-2 py-1 text-xs text-rose-600" disabled={pending || r.users > 0} title={r.users ? "Reassign its users first" : "Delete"} onClick={() => window.confirm(`Delete role "${r.name}"?`) && run(() => deleteRoleAction(r.id))}>
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="self-start">
        <CardHeader title="Preview as…" />
        <div className="space-y-3 p-4 text-sm">
          <select className="field" value={preview?.userId ?? ""} onChange={(e) => router.push(e.target.value ? `?preview=${e.target.value}` : "?")}>
            <option value="">Pick a person</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {preview ? (
            <div className="space-y-2">
              <p>
                <strong>{preview.name}</strong> ({preview.roleName}) can see <strong>{preview.leads} leads</strong> ({preview.openLeads} open)
                {preview.scope === "ALL" ? " in every branch" : preview.branches.length ? ` in ${preview.branches.join(", ")}` : ""}
                {preview.scope === "OWN" ? " — only their own" : ""}, and <strong>{preview.users}</strong> {preview.users === 1 ? "person" : "people"}.
              </p>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-500 uppercase">Can</div>
                <div className="flex flex-wrap gap-1">
                  {preview.permissions.map((p) => (
                    <Chip key={p} className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                      {PERMISSION_LABEL[p as Permission] ?? p}
                    </Chip>
                  ))}
                  {!preview.permissions.length && <span className="text-xs text-slate-500">Only view their own leads.</span>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">See exactly what someone sees and can do, using the same rules as the rest of the app.</p>
          )}
        </div>
      </Card>

      {editing && <RoleModal role={editing === "new" ? null : editing} actorPermissions={actorPermissions} actorScope={actorScope} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RoleModal({ role, actorPermissions, actorScope, onClose }: { role: RoleRow | null; actorPermissions: string[]; actorScope: DataScope; onClose: () => void }) {
  const { pending, run } = useServerAction();
  const locked = !!role?.isLocked;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [scope, setScope] = useState<DataScope>(role?.scope ?? "OWN");
  const [perms, setPerms] = useState<string[]>(role?.permissions ?? []);
  const toggle = (k: string) => setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <Modal open onClose={onClose} title={role ? (locked ? role.name : `Edit ${role.name}`) : "New role"} wide>
      <div className="space-y-5 text-sm">
        {locked && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">The Super Admin role always has every permission and sees everything. It can&apos;t be changed or deleted, so the business can never lock itself out.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Role name</span>
            <input className="field" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} autoFocus={!locked} />
          </label>
          <label>
            <span className="label">Description</span>
            <input className="field" value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <div>
          <span className="label">Which records can they see?</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["OWN", "BRANCH", "ALL"] as const).map((s) => {
              const beyond = SCOPE_ORDER[s] > SCOPE_ORDER[actorScope];
              return (
                <label key={s} className={cn("cursor-pointer rounded-lg border p-3", scope === s ? "border-brand bg-brand/5" : "border-slate-200", (locked || beyond) && "cursor-not-allowed opacity-50")}>
                  <input type="radio" className="sr-only" checked={scope === s} disabled={locked || beyond} onChange={() => setScope(s)} />
                  <div className="font-medium text-ink">{SCOPE_LABEL[s]}</div>
                  <div className="text-xs text-slate-500">{SCOPE_HINT[s]}</div>
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 text-xs font-medium tracking-wider text-slate-500 uppercase">{g.group}</div>
              <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {g.items.map((i) => {
                  const beyond = !actorPermissions.includes(i.key);
                  return (
                    <label key={i.key} className={cn("flex items-start gap-2", (locked || beyond) && "opacity-50")} title={beyond ? "You don't have this permission yourself" : undefined}>
                      <input type="checkbox" className="mt-0.5" checked={perms.includes(i.key)} disabled={locked || beyond} onChange={() => toggle(i.key)} />
                      <span>
                        <span className="text-ink">{i.label}</span>
                        <span className="block text-xs text-slate-500">{i.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {!locked && (
          <button className="btn w-full" disabled={pending || !name.trim()} onClick={() => run(() => saveRoleAction(role?.id ?? null, { name, description, scope, permissions: perms }), onClose)}>
            {pending ? "Saving…" : role ? "Save role" : "Create role"}
          </button>
        )}
      </div>
    </Modal>
  );
}
