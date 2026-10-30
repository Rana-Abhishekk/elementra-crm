// Check the seeded demo scenarios against the database (expected branch / rule / queue / pipeline).
// (02_REFERENCE_DATA §8). Creates real leads — run on a demo database. Usage: npm run demo:check
import { prisma } from "../lib/prisma";
import { runScenario } from "../lib/demo/scenarios";

const EXPECT: Record<number, { rule: string; branch: string | null; status: string; pipeline?: string; check?: (t: string[]) => boolean }> = {
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
  11: { rule: "NEAREST_IN_RADIUS", branch: null, status: "RESOLVED", pipeline: "Turnkey / Full Home" },
};

async function main() {
  let failures = 0;
  const ids = Object.keys(EXPECT).map(Number);
  for (const id of ids) {
    const r = await runScenario(id, null);
    if (!r.ok) {
      failures++;
      console.log(`✗ #${id} ${r.error}`);
      continue;
    }
    const d = r.decision;
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: d.leadId }, include: { pipeline: { select: { name: true } }, stage: { select: { isInitial: true } } } });
    const e = EXPECT[id];
    const ok =
      d.rule === e.rule &&
      (e.branch === null || d.branchName === e.branch) &&
      lead.locationStatus === e.status &&
      (!e.pipeline || (lead.pipeline.name === e.pipeline && lead.stage.isInitial)) &&
      (!e.check || e.check(d.explanation));
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} #${id} ${d.refCode} ${d.rule} → ${d.branchName ?? "queue"}${d.ownerName ? ` / ${d.ownerName}` : ""} · ${d.toast}`);
    if (!ok) console.log(`    expected ${JSON.stringify(e)}\n    got ${d.explanation.join(" | ")}`);
  }
  // Scenario 10 leaves Arjun on leave, like the live demo; undo it so the next run starts clean
  await prisma.user.updateMany({ where: { email: "arjun@elementra.test" }, data: { onLeave: false } });
  await prisma.$disconnect();
  console.log(failures ? `\n${failures} scenario(s) failed` : `\nAll ${ids.length} scenarios OK`);
  process.exit(failures ? 1 : 0);
}

main();
