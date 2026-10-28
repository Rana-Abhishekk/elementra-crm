// Synthetic demo history (deterministic, dates relative to now). Safe to re-run: clears demo rows first.
// Usage: npm run db:seed:demo   (db:reset runs it after the base seed)
import { prisma } from "../lib/prisma";
import { clearDemoData, generateDemoHistory } from "../lib/demo/generate";
import { runReminderEngine } from "../lib/domain/reminders/engine";

async function main() {
  const started = Date.now();
  await clearDemoData();
  await generateDemoHistory({ log: (s) => console.log(s) });
  // One engine pass so SLA breaches, revive reminders and the morning digest are already there
  const summary = await runReminderEngine();
  console.log(`Reminder engine: ${JSON.stringify(summary.byRule)}`);
  console.log(`Demo data ready in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
