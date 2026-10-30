"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { AssignmentStrategy, BranchKind } from "@prisma/client";
import { Card, CardHeader } from "@/components/ui";
import { useServerAction } from "@/lib/use-action";
import { saveBranchMasterAction } from "../../actions";
import { addPincodeRuleAction, removePincodeRuleAction } from "../../../settings/actions";

const PinPicker = dynamic(() => import("@/components/map/pin-picker"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading map…</div> });

interface BranchData {
  id: string;
  code: string;
  name: string;
  kind: BranchKind;
  city: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  serviceRadiusKm: number;
  assignmentStrategy: AssignmentStrategy;
  isActive: boolean;
}

export function BranchForm({ branch }: { branch: BranchData | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    code: branch?.code ?? "",
    name: branch?.name ?? "",
    kind: branch?.kind ?? ("EXPERIENCE_CENTRE" as BranchKind),
    city: branch?.city ?? "",
    area: branch?.area ?? "",
    lat: branch?.lat?.toString() ?? "",
    lng: branch?.lng?.toString() ?? "",
    serviceRadiusKm: branch?.serviceRadiusKm?.toString() ?? "15",
    assignmentStrategy: branch?.assignmentStrategy ?? ("ROUND_ROBIN" as AssignmentStrategy),
    isActive: branch?.isActive ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

  // After saving, go back to the Branches list (the new branch is in it)
  function save() {
    start(async () => {
      const res = await saveBranchMasterAction(branch?.id ?? null, { ...f, lat: num(f.lat), lng: num(f.lng), serviceRadiusKm: Number(f.serviceRadiusKm) || 0 });
      if (!res.ok) return void toast.error(res.error);
      toast.success(branch ? `${f.name} saved` : `${f.name} created — routing uses it now. Open it to add pincode rules.`);
      router.push("/dashboard/masters/branches");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader title="Details" />
      <div className="grid gap-4 p-4 text-sm sm:grid-cols-2">
        <label>
          <span className="label">Code</span>
          <input className="field font-mono uppercase" value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="THN" maxLength={6} />
        </label>
        <label>
          <span className="label">Name</span>
          <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Thane Experience Centre" />
        </label>
        <label>
          <span className="label">Kind</span>
          <select className="field" value={f.kind} onChange={(e) => set("kind", e.target.value as BranchKind)}>
            <option value="EXPERIENCE_CENTRE">Experience Centre</option>
            <option value="ONLINE_DESK">Online Desk</option>
          </select>
        </label>
        <label>
          <span className="label">City</span>
          <input className="field" value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Thane" />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Area label</span>
          <input className="field" value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="Thane West, 400601" />
        </label>
        {f.kind === "EXPERIENCE_CENTRE" && (
          <>
            <div className="h-64 overflow-hidden rounded-lg ring-1 ring-slate-200 sm:col-span-2">
              <PinPicker lat={num(f.lat)} lng={num(f.lng)} radiusKm={Number(f.serviceRadiusKm) || 0} onPick={(lat, lng) => setF((s) => ({ ...s, lat: String(lat), lng: String(lng) }))} />
            </div>
            <label>
              <span className="label">Latitude</span>
              <input className="field" inputMode="decimal" value={f.lat} onChange={(e) => set("lat", e.target.value)} placeholder="19.2183" />
            </label>
            <label>
              <span className="label">Longitude</span>
              <input className="field" inputMode="decimal" value={f.lng} onChange={(e) => set("lng", e.target.value)} placeholder="72.9781" />
            </label>
            <label>
              <span className="label">Service radius (km)</span>
              <input className="field" inputMode="decimal" value={f.serviceRadiusKm} onChange={(e) => set("serviceRadiusKm", e.target.value)} />
            </label>
          </>
        )}
        <label>
          <span className="label">Assignment inside the branch</span>
          <select className="field" value={f.assignmentStrategy} onChange={(e) => set("assignmentStrategy", e.target.value as AssignmentStrategy)}>
            <option value="ROUND_ROBIN">Round-robin</option>
            <option value="LEAST_OPEN_LEADS">Fewest open leads</option>
          </select>
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active (used by routing)
        </label>
        <div className="sm:col-span-2">
          <button className="btn" disabled={pending} onClick={save}>
            {pending ? "Saving…" : branch ? "Save branch" : "Create branch"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export function PincodeRules({ branchId, rules }: { branchId: string; rules: { id: string; pincode: string; label: string | null }[] }) {
  const { pending, run } = useServerAction();
  const [pin, setPin] = useState("");
  const [label, setLabel] = useState("");
  return (
    <Card>
      <CardHeader title={`Pincode rules (${rules.length})`} />
      <div className="space-y-3 p-4 text-sm">
        <p className="text-xs text-slate-500">These pincodes always go to this branch, whatever the distance.</p>
        <div className="flex flex-wrap gap-1.5">
          {rules.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
              {r.pincode}
              {r.label ? <span className="text-slate-500">· {r.label}</span> : null}
              <button className="text-slate-400 hover:text-rose-600" disabled={pending} onClick={() => run(() => removePincodeRuleAction(r.id))} aria-label={`Remove ${r.pincode}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          {!rules.length && <span className="text-xs text-slate-400">None — distance decides.</span>}
        </div>
        <div className="flex gap-2">
          <input className="field w-28" inputMode="numeric" maxLength={6} placeholder="400601" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <input className="field" placeholder="Area (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <button className="btn-secondary w-full" disabled={pending || pin.length !== 6} onClick={() => run(() => addPincodeRuleAction(pin, branchId, label), () => (setPin(""), setLabel("")))}>
          Add pincode rule
        </button>
      </div>
    </Card>
  );
}
