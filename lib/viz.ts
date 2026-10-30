// Chart colours. Kept out of components/charts.tsx (a client module) so server components can read them.
export const VIZ = {
  series: "#2a78d6", // validated categorical slot 1 (light surface)
  brand: "#7b3f9e", // validated slot 2, paired with series
  good: "#10b981", // status: won
  critical: "#e34948", // status: overdue / breached
  muted: "#cbd5e1",
  grid: "#e2e8f0",
  axis: "#64748b",
  text: "#0f172a",
};
