"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitEnquiry, type EnquiryState } from "./actions";

export function EnquiryForm({ products }: { products: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, { status: "idle" });

  if (state.status === "done") {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h2 className="mt-3 text-xl font-semibold text-ink">Thank you{state.firstName ? `, ${state.firstName}` : ""}!</h2>
        <p className="mt-2 text-slate-600">
          {state.routed && state.branch
            ? `Our ${state.branch} team will call you shortly.`
            : state.outOfArea
              ? "Thank you for considering Elementra. We'll review your location and get back to you."
              : "We'll call you to confirm your site location and connect you with the nearest Experience Centre."}
        </p>
        <p className="mt-1 text-sm text-slate-500">You&apos;ll also get a WhatsApp message from us.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Your name *</label>
        <input id="name" name="name" required className="field" autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Mobile number *</label>
          <input id="phone" name="phone" type="tel" required className="field" inputMode="tel" autoComplete="tel" placeholder="+91" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="field" autoComplete="email" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label" htmlFor="area">Site area / society</label>
          <input id="area" name="area" className="field" placeholder="e.g. Lokhandwala, Andheri West" />
        </div>
        <div>
          <label className="label" htmlFor="pincode">Site pincode</label>
          <input id="pincode" name="pincode" className="field" inputMode="numeric" maxLength={6} placeholder="400053" />
        </div>
      </div>
      <fieldset>
        <legend className="label">What are you looking for?</legend>
        <div className="flex flex-wrap gap-2">
          {products.map((p, i) => (
            <label key={p.id} className="cursor-pointer">
              <input type="checkbox" name="products" value={p.id} className="peer sr-only" defaultChecked={i === 0} />
              <span className="inline-block rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">
                {p.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="possession">When do you get possession?</label>
        <select id="possession" name="possession" className="field" defaultValue="">
          <option value="">Not sure</option>
          <option value="ready">Already have it</option>
          <option value="within_3_months">Within 3 months</option>
          <option value="3_6_months">3–6 months</option>
          <option value="6_12_months">6–12 months</option>
          <option value="after_12_months">After a year</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="message">Anything else?</label>
        <textarea id="message" name="message" rows={3} className="field" />
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.status === "error" && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-gold w-full py-3 text-base" disabled={pending}>
        {pending ? "Sending…" : "Request a call back"}
      </button>
    </form>
  );
}
