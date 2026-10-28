// Runs the 10 demo scenarios against the database and checks the expected branch / rule / queue
// (02_REFERENCE_DATA §8). Creates real leads — run on a demo database. Usage: npm run demo:check
import { prisma } from "../lib/prisma";
import { runScenario } from "../lib/demo/scenarios";

const EXPECT: Record<number, { rule: string; branch: string | null; status: string; check?: (t: string[]) => boolean }> = {
  1: { rule: "NEAREST_IN_RADIUS", branch: "Worli", status: "RESOLVED" },
  2: { rule: "NEAREST_IN_RADIUS", branch: "Andheri", status: "RESOLVED", check: (e) => e.some((l) => l.includes("Goregaon East") && l.includes("98%")) },
  3: { rule: "PINCODE_RULE", branch: "Worli", status: "RESOLVED", check: (e) => e.some((l) => l.includes("1.4 km nearer")) },
  4: { rule: "NEAREST_IN_RADIUS", branch: "Pune", status: "RESOLVED", check: (e) => e.some((l) => l.includes("10.5 km")) },
  5: { rule: "OUT_OF_AREA", branch: null, status: "OUT_OF_AREA", check: (e) => e.some((l) => l.includes("226.1 km")) },
  6: { rule: "OUT_OF_AREA", branch: null, status: "OUT_OF_AREA", check: (e) => e.some((l) => l.includes("31.8 km") && l.includes("just outside")) },
  7: { rule: "NEEDS_LOCATION", branch: "Online Desk", status: "NEEDS_LOCATION" },
  8: { rule: "RETURNING_SAME_OWNER", branch: null, status: "RESOLVED" },
  9: { rule: "NEAREST_IN_RADIUS", branch: "Andheri", status: "RESOLVED", check: (e) => e.some((l) => l.includes("8.3 km")) },
  10: { rule: "NEAREST_IN_RADIUS", branch: "Andheri", status: "RESOLVED", check: (e) => e.some((l) => l.includes("Skipped: Arjun Nair (on leave)")) },
};

async function main() {
  let failures = 0;
  for (let id = 1; id <= 10; id++) {
    const r = await runScenario(id, null);
    if (!r.ok) {
      failures++;
      console.log(`✗ #${id} ${r.error}`);
      continue;
    }
    const d = r.decision;
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: d.leadId } });
    const e = EXPECT[id];
    const ok = d.rule === e.rule && (e.branch === null || d.branchName === e.branch) && lead.locationStatus === e.status && (!e.check || e.check(d.explanation));
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} #${id} ${d.refCode} ${d.rule} → ${d.branchName ?? "queue"}${d.ownerName ? ` / ${d.ownerName}` : ""} · ${d.toast}`);
    if (!ok) console.log(`    expected ${JSON.stringify(e)}\n    got ${d.explanation.join(" | ")}`);
  }
  // Scenario 10 leaves Arjun on leave, like the live demo; undo it so the next run starts clean
  await prisma.user.updateMany({ where: { email: "arjun@elementra.test" }, data: { onLeave: false } });
  await prisma.$disconnect();
  console.log(failures ? `\n${failures} scenario(s) failed` : "\nAll 10 scenarios OK");
  process.exit(failures ? 1 : 0);
}

main();
