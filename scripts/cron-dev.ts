// Local reminder runner: calls /api/cron/reminders every 60 s (Vercel Hobby only runs crons once a day).
// Usage: npm run cron:dev   (or npm run dev:all to run it next to the dev server)
const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:4610"}/api/cron/reminders`;
const secret = process.env.CRON_SECRET;
const EVERY_MS = 60_000;

async function tick() {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    const body = (await res.json()) as { byRule?: Record<string, number>; evaluatedLeads?: number; error?: string };
    const fired = Object.entries(body.byRule ?? {}).map(([r, n]) => `${r}×${n}`).join(" ") || "nothing new";
    console.log(`[cron:dev ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST] ${res.status} ${body.error ?? `${body.evaluatedLeads} leads · ${fired}`}`);
  } catch {
    console.log("[cron:dev] app not reachable yet — retrying in 60 s");
  }
}

if (!secret) {
  console.error("Set CRON_SECRET in .env first.");
  process.exit(1);
}
console.log(`[cron:dev] calling ${url} every ${EVERY_MS / 1000} s`);
setTimeout(tick, 5_000);
setInterval(tick, EVERY_MS);
