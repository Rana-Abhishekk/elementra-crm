// Acceptance run of the §19 demo script against the database (the same server paths the UI calls).
// RESETS DEMO DATA first. Usage: npm run demo:acceptance   (then reset again before a live demo)
import { prisma } from "../lib/prisma";
import { clearDemoData, generateDemoHistory } from "../lib/demo/generate";
import { runScenario } from "../lib/demo/scenarios";
import { getSettings, setSetting } from "../lib/data/settings";
import { ingestLead } from "../lib/domain/leads/ingest";
import { rerouteLead } from "../lib/domain/leads/reroute";
import { changeStage, logCall, setFollowUp } from "../lib/domain/leads/workflow";
import { runReminderEngine } from "../lib/domain/reminders/engine";
import { wallTime } from "../lib/domain/time";

let failures = 0;
function check(step: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${step}${detail ? ` — ${detail}` : ""}`);
}
const user = (email: string) => prisma.user.findUniqueOrThrow({ where: { email } });

async function main() {
  const started = Date.now();
  await clearDemoData();
  await generateDemoHistory();
  await runReminderEngine();
  const owner = await user("aarav@elementra.test");

  // 1. Dashboard has believable numbers
  const leads = await prisma.lead.count();
  const overdue = await prisma.task.count({ where: { status: "OPEN", dueAt: { lt: new Date() }, type: { in: ["FOLLOW_UP", "FIRST_CALL", "QUOTATION_FOLLOW_UP"] } } });
  check("1. Demo history", leads >= 170 && overdue >= 8, `${leads} leads, ${overdue} overdue follow-ups`);

  // 2–3. Instagram Worli lead: routed, owner copy, welcome WhatsApp
  const before = await prisma.notification.count({ where: { userId: owner.id } });
  const s1 = await runScenario(1, owner.id);
  const rhea = s1.ok ? await prisma.lead.findUniqueOrThrow({ where: { id: s1.decision.leadId }, include: { messages: true, activities: true } }) : null;
  check("2. Instagram ad → Worli", !!s1.ok && s1.decision.branchName === "Worli" && (await prisma.notification.count({ where: { userId: owner.id } })) > before, s1.ok ? s1.decision.toast : s1.error);
  check("3. Timeline + welcome", !!rhea && rhea.messages.some((m) => m.templateCode === "welcome_enquiry") && ["SYSTEM", "ROUTING", "ASSIGNMENT"].every((t) => rhea.activities.some((a) => a.type === t)));

  // 4–5. Fuzzy + pincode rule
  const s2 = await runScenario(2, owner.id);
  check("4. Misspelt suburb", !!s2.ok && s2.decision.branchName === "Andheri" && s2.decision.explanation.some((l) => l.includes("Goregaon East") && l.includes("98%")));
  const s3 = await runScenario(3, owner.id);
  check("5. Navi Mumbai rule", !!s3.ok && s3.decision.rule === "PINCODE_RULE" && s3.decision.explanation.some((l) => l.includes("1.4 km nearer")));

  // 6. Out of area + accept Panvel for Worli
  const s5 = await runScenario(5, owner.id);
  const s6 = await runScenario(6, owner.id);
  const worli = await prisma.branch.findUniqueOrThrow({ where: { code: "WOR" } });
  const kabir = await user("kabir@elementra.test");
  const accepted = s6.ok ? await rerouteLead(s6.decision.leadId, { forceBranchId: worli.id }, kabir.id) : null;
  check("6. Out of area + accept Panvel", !!s5.ok && s5.decision.rule === "OUT_OF_AREA" && !!accepted?.ok && accepted.branchName === "Worli", accepted?.ok ? accepted.toast : "");

  // 7. No location → Online Desk types "Borivalli west" → handover to Andheri
  const s7 = await runScenario(7, owner.id);
  const ananya = await user("ananya@elementra.test");
  const handover = s7.ok ? await rerouteLead(s7.decision.leadId, { siteAddress: "Borivalli west", pincode: null }, ananya.id) : null;
  check("7. Needs location → handover", !!s7.ok && s7.decision.rule === "NEEDS_LOCATION" && !!handover?.ok && handover.branchName === "Andheri", handover?.ok ? handover.toast : "");

  // 8. Rep on leave, then back
  const s10 = await runScenario(10, owner.id);
  check("8. Rep on leave", !!s10.ok && s10.decision.skipped.some((s) => s.name === "Arjun Nair"), s10.ok ? s10.decision.ownerName ?? "" : "");
  await prisma.user.update({ where: { email: "arjun@elementra.test" }, data: { onLeave: false } });

  // 9. SLA at 2 minutes → breach after 3 minutes
  const settings = await getSettings();
  await setSetting("sla", { ...settings.sla, firstContactMins: 2 });
  const sla = await ingestLead({ firstName: "Sla", lastName: "Check", phone: "+919000079999", siteAddress: "Chembur", source: "WEBSITE", channel: "WEBSITE_FORM" });
  const in3 = new Date(Date.now() + 3 * 60_000);
  const isOpenHours = (await import("../lib/domain/time")).isWithinWorkingHours(in3, settings.workingHours);
  await runReminderEngine({ now: in3 });
  const breach = sla.ok ? await prisma.notification.findFirst({ where: { dedupeKey: `R1:${sla.lead.id}` } }) : null;
  await setSetting("sla", { ...settings.sla, firstContactMins: 60 });
  check("9. SLA breach (2 min)", isOpenHours ? !!breach : true, isOpenHours ? breach?.title ?? "no notification" : "outside working hours — skipped (SLA counts working minutes)");

  // 10. Andheri rep: log "No answer", follow up tomorrow
  const arjun = await user("arjun@elementra.test");
  const task = await prisma.task.findFirst({ where: { assigneeId: arjun.id, status: "OPEN", type: "FOLLOW_UP", dueAt: { lt: new Date() } } });
  if (task?.leadId) {
    await logCall(task.leadId, "NO_ANSWER", null, arjun.id);
    await setFollowUp(task.leadId, wallTime(new Date(), "11:00", "Asia/Kolkata", 1), null, arjun.id);
  }
  const moved = task ? await prisma.task.findUniqueOrThrow({ where: { id: task.id } }) : null;
  check("10. My Day: call + follow-up tomorrow", !!moved && moved.dueAt > new Date());

  // 11. Pipeline: forward to Quotation Sent; another to Lost – On hold with revive date
  const q = await prisma.lead.findFirstOrThrow({ where: { ownerId: arjun.id, stage: { in: ["QUALIFIED", "DISCOVERY_MEETING", "QUOTATION_REQUESTED"] } } });
  const toQuote = await changeStage(q.id, "QUOTATION_SENT", { actorId: arjun.id, canReopen: false });
  const n = await prisma.lead.findFirstOrThrow({ where: { ownerId: arjun.id, stage: "NEGOTIATION" } });
  const hold = await changeStage(n.id, "CLOSED_LOST", { actorId: arjun.id, canReopen: false, lostReason: "ON_HOLD" });
  const held = await prisma.lead.findUniqueOrThrow({ where: { id: n.id } });
  check("11. Pipeline moves", toQuote.ok && hold.ok && !!held.reviveAt);

  // 12. Visit tomorrow 11:00 → reminder in the outbox
  const appt = await prisma.appointment.create({ data: { leadId: q.id, branchId: q.branchId!, hostId: arjun.id, scheduledAt: wallTime(new Date(), "11:00", "Asia/Kolkata", 1) } });
  await runReminderEngine();
  const reminder = await prisma.outboundMessage.findFirst({ where: { dedupeKey: `R4:${appt.id}` } });
  check("12. Visit reminder", !!reminder, reminder?.body.slice(0, 60));

  // Idempotency: a second engine run creates nothing
  const again = await runReminderEngine();
  check("Engine idempotent", again.tasksCreated + again.notificationsCreated + again.messagesSent === 0);

  console.log(failures ? `\n${failures} step(s) failed` : `\nAcceptance run OK in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}

main();
