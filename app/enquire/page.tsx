import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { EnquiryForm } from "./enquiry-form";

// The product list comes from the Product master
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enquire — Elementra",
  description: "Bespoke kitchens, wardrobes and furniture. Tell us about your home and our nearest Experience Centre will call you.",
};

export default async function EnquirePage() {
  const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  return (
    <main className="min-h-screen bg-canvas">
      <header className="bg-sidebar px-4 pt-10 pb-24 text-center text-white">
        <div className="text-2xl font-semibold tracking-[0.3em]">ELEMENTRA</div>
        <div className="mt-1 text-xs tracking-widest text-gold uppercase">Bespoke kitchens · wardrobes · furniture</div>
        <p className="mx-auto mt-6 max-w-md text-sm text-white/80">
          Tell us a little about your home. Our nearest Experience Centre — Worli, Andheri, Tardeo or Pune — will call you.
        </p>
      </header>
      <div className="mx-auto -mt-16 max-w-lg px-4 pb-16">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <EnquiryForm products={products} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">We use your details only to respond to this enquiry.</p>
      </div>
    </main>
  );
}
