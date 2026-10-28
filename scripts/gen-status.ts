// Writes STATUS.md from lib/features.ts (the single feature registry). Run: npm run status
import { writeFileSync } from "node:fs";
import { FEATURES, STATUS_META, featuresByWeek, type FeatureStatus } from "../lib/features";

const order: FeatureStatus[] = ["LIVE", "SIMULATED", "PREVIEW", "IN_PROGRESS", "PLANNED"];
const esc = (s = "") => s.replace(/\|/g, "\\|");

const lines: string[] = [
  "# Elementra CRM — Feature status",
  "",
  "> Generated from `lib/features.ts` by `npm run status`. Do not edit by hand.",
  "",
  "| Status | Count |",
  "|---|---|",
  ...order.map((s) => `| ${STATUS_META[s].label} | ${FEATURES.filter((f) => f.status === s).length} |`),
  "",
];

for (const { label, items } of featuresByWeek()) {
  lines.push(`## ${label}`, "", "| ID | Feature | Status | Notes | How to demo | Known gaps |", "|---|---|---|---|---|---|");
  for (const f of items) {
    const status = STATUS_META[f.status].label + (f.isAddon ? " · add-on" : "");
    lines.push(`| ${f.id} | ${esc(f.title)} | ${status} | ${esc(f.note)} | ${esc(f.demo ?? "")} | ${esc(f.gaps ?? "")} |`);
  }
  lines.push("");
}

writeFileSync("STATUS.md", lines.join("\n"));
console.log(`STATUS.md written (${FEATURES.length} features)`);
