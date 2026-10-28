"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { PRODUCTS, PRODUCT_LABEL, SOURCE_LABEL } from "@/lib/domain/labels";
import { createLeadAction } from "../actions";

export function NewLeadForm({ architects }: { architects: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function submit(form: FormData) {
    start(async () => {
      const res = await createLeadAction(form);
      if (!res.ok) return void toast.error(res.error);
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
          {PRODUCTS.map((p) => (
            <label key={p} className="cursor-pointer">
              <input type="checkbox" name="products" value={p} defaultChecked={p === "KITCHEN"} className="peer sr-only" />
              <span className="inline-block rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">
                {PRODUCT_LABEL[p]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="label">Source *</span>
          <select name="source" className="field" defaultValue="CALL">
            {Object.entries(SOURCE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
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
