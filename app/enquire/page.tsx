import type { Metadata } from "next";
import { EnquiryForm } from "./enquiry-form";

export const metadata: Metadata = {
  title: "Enquire — Elementra",
  description: "Bespoke kitchens, wardrobes and furniture. Tell us about your home and our nearest Experience Centre will call you.",
};

export default function EnquirePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-brand px-4 pt-10 pb-24 text-center text-white">
        <div className="text-2xl font-semibold tracking-[0.3em]">ELEMENTRA</div>
        <div className="mt-1 text-xs tracking-widest text-gold uppercase">Bespoke kitchens · wardrobes · furniture</div>
        <p className="mx-auto mt-6 max-w-md text-sm text-white/80">
          Tell us a little about your home. Our nearest Experience Centre — Worli, Andheri, Tardeo or Pune — will call you.
        </p>
      </header>
      <div className="mx-auto -mt-16 max-w-lg px-4 pb-16">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <EnquiryForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">We use your details only to respond to this enquiry.</p>
      </div>
    </main>
  );
}
