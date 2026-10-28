import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { FeatureBadge } from "@/components/feature-badge";
import { Card, CardHeader, PageHeader } from "@/components/ui";

// Concept screen — no logic. Shows the proposed next phase so the client sees where it fits.
const LINES = [
  { item: "Parallel kitchen — base + wall units", finish: "Acrylic, high gloss · Warm grey", qty: "14.5 rft", rate: "₹18,500 / rft", amount: "₹2,68,250" },
  { item: "Tall unit with appliance housing", finish: "Acrylic · Warm grey", qty: "1", rate: "₹96,000", amount: "₹96,000" },
  { item: "Quartz countertop", finish: "Calacatta 20 mm", qty: "16 sqft", rate: "₹4,200 / sqft", amount: "₹67,200" },
  { item: "Hob + chimney", finish: "90 cm, auto-clean", qty: "1 set", rate: "₹1,12,000", amount: "₹1,12,000" },
  { item: "Hardware package", finish: "Soft-close, tandem drawers", qty: "1", rate: "₹58,000", amount: "₹58,000" },
];

export default async function QuotationsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Quotations"
        badge={<FeatureBadge feature="F37" />}
        description="Proposed next phase: build a quotation from product line items and finishes, share it as a PDF on WhatsApp, and track versions. Concept only — nothing here is saved."
        actions={
          <button className="btn" disabled>
            <Plus className="size-4" /> New quotation
          </button>
        }
      />
      <Card className="pointer-events-none relative overflow-hidden opacity-90 select-none">
        <div className="absolute top-4 right-4 rotate-6 rounded border-2 border-slate-300 px-3 py-1 text-xs font-semibold tracking-widest text-slate-400 uppercase">Concept</div>
        <CardHeader title={<span className="inline-flex items-center gap-2"><FileText className="size-4 text-gold" /> Q-2026-0142 · Kitchen — sample customer · v2</span>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Finish</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((l) => (
                <tr key={l.item} className="border-t border-slate-100">
                  <td className="p-3">{l.item}</td>
                  <td className="p-3 text-slate-600">{l.finish}</td>
                  <td className="p-3 text-right">{l.qty}</td>
                  <td className="p-3 text-right">{l.rate}</td>
                  <td className="p-3 text-right">{l.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={4} className="p-3 text-right text-slate-500">Subtotal · GST and installation shown separately</td>
                <td className="p-3 text-right font-semibold">₹6,01,450</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-4 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">Finish options side by side (laminate / acrylic / PU)</div>
          <div className="rounded-lg bg-slate-50 p-3">One-tap PDF to the customer on WhatsApp</div>
          <div className="rounded-lg bg-slate-50 p-3">Versions + approval before it goes out</div>
        </div>
      </Card>
    </div>
  );
}
