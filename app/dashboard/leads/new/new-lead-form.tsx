"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createLeadAction } from "../actions";

type Option = { id: string; name: string };

export function NewLeadForm({ architects, products, sources }: { architects: { id: string; label: string }[]; products: Option[]; sources: Option[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function submit(form: FormData) {
    start(async () => {
      const res = await createLeadAction(form);
      if (!res.ok) {
        const existing = res.existingLeadId;
        return void toast.error(res.error, existing ? { duration: 10000, action: { label: "Open it", onClick: () => router.push(`/dashboard/leads/${existing}`) } } : undefined);
      }
      toast.success(res.message);
      router.push(`/dashboard/leads/${res.id}`);
    });
  }

  return (
    <form action={submit} className="card space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Customer name *</span>
          <input name="name" required className="field" placeholder="e.g. Priya Sharma" />
        </label>
        <label>
          <span className="label">Phone</span>
          <input name="phone" className="field" inputMode="tel" placeholder="90000 12345" />
        </label>
        <label>
          <span className="label">Email</span>
          <input name="email" type="email" className="field" />
        </label>
        <label>
          <span className="label">Site area / address</span>
          <input name="siteAddress" className="field" placeholder="e.g. Lokhandwala, Andheri West" />
        </label>
        <label>
          <span className="label">Site pincode</span>
          <input name="pincode" className="field" inputMode="numeric" maxLength={6} />
        </label>
      </div>
      <fieldset>
        <legend className="label">Products</legend>
        <div className="flex flex-wrap gap-2">
          {products.map((p, i) => (
            <label key={p.id} className="cursor-pointer">
              <input type="checkbox" name="products" value={p.id} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-block rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">
                {p.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="label">Source *</span>
          <select name="source" className="field" defaultValue="" required>
            <option value="" disabled>
              Pick a source
            </option>
            {sources.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Priority</span>
          <select name="priority" className="field" defaultValue="WARM">
            <option value="HOT">Hot</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
          </select>
        </label>
        <label>
          <span className="label">Message language</span>
          <select name="language" className="field" defaultValue="en">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </label>
        <label className="sm:col-span-3">
          <span className="label">Architect (if referred)</span>
          <select name="architectId" className="field" defaultValue="">
            <option value="">None</option>
            {architects.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">Notes</span>
        <textarea name="notes" rows={3} className="field" />
      </label>
      <button className="btn w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving & routing…" : "Save lead"}
      </button>
    </form>
  );
}
