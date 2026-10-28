// Lead money is whole rupees (Deal.amount stays in paise — see lib/format.ts).

export function formatINR(rupees: number | null | undefined): string {
  if (rupees == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
}

/** ₹8.5 L, ₹1.2 Cr, ₹45,000 */
export function formatLakh(rupees: number | null | undefined): string {
  if (rupees == null) return "—";
  const abs = Math.abs(rupees);
  const trim = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
  if (abs >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000)} Cr`;
  if (abs >= 1_00_000) return `₹${trim(rupees / 1_00_000)} L`;
  return formatINR(rupees);
}
