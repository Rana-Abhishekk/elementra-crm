// Synthetic demo history (02_REFERENCE_DATA §9): ~180 leads over the last 75 days, relative to `now`,
// deterministic (PRNG seed 20261028). Uses the real routing/assignment functions so every lead carries a
// believable explanation. Writes directly (bulk) rather than through ingestLead() for speed.
import type { ActivityType, CallOutcome, LeadSource, LeadStage, LostReason, Prisma, Priority, Product, ProjectStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { resolveLocation } from "@/lib/domain/geo/resolve";
import { decideBranch, shortBranch } from "@/lib/domain/routing/decide";
import { addWorkingMinutes, startOfIstDay, wallTime } from "@/lib/domain/time";
import { renderTemplate } from "@/lib/domain/messaging/render";
import { productPhrase, PROJECT_STAGES } from "@/lib/domain/labels";
import { STAGE_LABEL, stageLabel } from "@/lib/domain/stages";
import { loadRoutingContext } from "@/lib/domain/leads/context";
import {
  CAMPAIGN_ADS,
  CAMPAIGN_ADSETS,
  CAMPAIGN_FORM,
  FIRST_NAMES,
  LAST_NAMES,
  MISSPELLINGS,
  NOTE_SNIPPETS,
  SOCIETIES,
  SOURCE_WEIGHTS,
  campaignForMonth,
  fillSnippet,
  salutationFor,
  syntheticEmail,
  syntheticPhone,
} from "./pools";
import { between, intBetween, mulberry32, pick, weighted, type Rng } from "./prng";

export const DEMO_SEED = 20261028;
const TOTAL = 180;
const DAY = 86400_000;

const AREAS: Record<string, string[]> = {
  WOR: ["Worli", "Prabhadevi", "Lower Parel", "Dadar West", "Dadar East", "Matunga", "Mahim", "Bandra West", "Khar West", "Chembur", "Sion", "Wadala", "Vashi", "Nerul", "Kharghar", "CBD Belapur", "Bandra Kurla Complex"],
  AND: ["Andheri West", "Andheri East", "Juhu", "Goregaon East", "Goregaon West", "Malad West", "Kandivali East", "Kandivali West", "Borivali West", "Powai", "Ghatkopar West", "Thane West", "Ghodbunder Road", "Santacruz West", "Vile Parle East", "Mulund West", "Jogeshwari West"],
  TAR: ["Tardeo", "Peddar Road", "Malabar Hill", "Breach Candy", "Colaba", "Churchgate", "Walkeshwar", "Grant Road", "Mahalaxmi", "Byculla"],
  PUN: ["Baner", "Kothrud", "Aundh", "Wakad", "Pimple Saudagar", "Koregaon Park", "Viman Nagar", "Hadapsar", "Kharadi"],
  OOA: ["Surat", "Panvel", "Kalyan", "Nashik", "Hyderabad", "Raipur", "Ratnagiri", "Virar", "Lonavala"],
};
const OOA_TEXT: Record<string, string> = {
  Surat: "Adajan, Surat, Gujarat",
  Hyderabad: "Gachibowli, Hyderabad",
  Raipur: "Shankar Nagar, Raipur, Chhattisgarh",
  Ratnagiri: "Ratnagiri",
  Panvel: "New Panvel 410206",
};

type Outcome = "WOR" | "AND" | "TAR" | "PUN" | "OOA" | "NEEDS";

interface LeadPlan {
  idx: number;
  createdAt: Date;
  first: string;
  last: string;
  phone: string;
  email: string | null;
  salutation: string | null;
  source: LeadSource;
  outcome: Outcome;
  address: string | null;
  pincode: string | null;
  products: Product[];
  priority: Priority;
  stage: LeadStage;
  lostReason: LostReason | null;
  architect: boolean;
  /** found without a location, later captured by the Online Desk and handed over */
  viaDesk: boolean;
}

const PROJECT_SPREAD = [7, 7, 5, 4, 3, 2, 1, 0, 0, 0];

const MONTH = (d: Date) => d.toLocaleString("en-IN", { month: "short", timeZone: "Asia/Kolkata" });

function stageFor(rng: Rng, ageDays: number): { stage: LeadStage; lostReason: LostReason | null } {
  const lost = (): LostReason => weighted(rng, [["NO_RESPONSE", 55], ["BUDGET", 15], ["COMPETITOR", 13], ["TIMELINE", 8], ["ON_HOLD", 5], ["OTHERS", 4]] as const);
  const table: readonly (readonly [string, number])[] =
    ageDays <= 2
      ? [["NEW", 55], ["CONTACTED", 30], ["QUALIFIED", 15]]
      : ageDays <= 14
        ? [["CONTACTED", 20], ["QUALIFIED", 30], ["DISCOVERY_MEETING", 15], ["QUOTATION_REQUESTED", 10], ["LOST_NR", 20], ["LOST", 5]]
        : ageDays <= 45
          ? [["QUALIFIED", 15], ["DISCOVERY_MEETING", 10], ["QUOTATION_SENT", 18], ["NEGOTIATION", 8], ["TOKEN_RECEIVED", 4], ["CLOSED_WON", 5], ["LOST", 40]]
          : [["QUALIFIED", 10], ["QUOTATION_SENT", 8], ["NEGOTIATION", 4], ["CLOSED_WON", 10], ["LOST", 68]];
  const s = weighted(rng, table);
  if (s === "LOST_NR") return { stage: "CLOSED_LOST", lostReason: "NO_RESPONSE" };
  if (s === "LOST") return { stage: "CLOSED_LOST", lostReason: lost() };
  return { stage: s as LeadStage, lostReason: null };
}

/** Lead creation times: 75 days, weekdays ~1.3× weekends, ~22 in the last 7 days, 30% at night. */
function creationTimes(rng: Rng, now: Date): Date[] {
  const days: { offset: number; w: number }[] = [];
  for (let d = 0; d < 75; d++) {
    const day = startOfIstDay(now, -d);
    const dow = new Date(day.getTime() + 6 * 3600_000).getUTCDay();
    days.push({ offset: d, w: (dow === 0 || dow === 6 ? 1 : 1.3) * (d < 7 ? 1.25 : 1) });
  }
  const recent = 22;
  const out: Date[] = [];
  const pickDay = (pool: typeof days) => weighted(rng, pool.map((x) => [x.offset, x.w] as const));
  for (let i = 0; i < TOTAL; i++) {
    const offset = i < recent ? pickDay(days.slice(0, 7)) : pickDay(days.slice(7));
    const night = rng() < 0.3;
    const hour = night ? pick(rng, [22, 23, 0, 1, 7, 8, 9]) : intBetween(rng, 10, 21);
    const minute = intBetween(rng, 0, 59);
    let t = wallTime(startOfIstDay(now, -offset), `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    if (t > now) t = new Date(now.getTime() - intBetween(rng, 20, 300) * 60_000);
    out.push(t);
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

export async function generateDemoHistory(opts: { now?: Date; log?: (s: string) => void } = {}) {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => {});
  const rng = mulberry32(DEMO_SEED);
  const ctx = await loadRoutingContext();
  const settings = await getSettings();
  const wh = settings.workingHours;
  const branchByCode = Object.fromEntries(ctx.branches.map((b) => [b.code, b]));
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, branchId: true, receivesLeads: true, email: true } });
  const repsOf = (branchId: string) => users.filter((u) => u.branchId === branchId && u.receivesLeads);
  const managerOf = (branchId: string) => users.find((u) => u.branchId === branchId && u.role === "SALES_MANAGER");
  const presales = users.filter((u) => u.role === "PRESALES");
  const owner = users.find((u) => u.role === "OWNER") ?? users.find((u) => u.role === "ADMIN")!;
  const arjun = users.find((u) => u.email === "arjun@elementra.test");
  const architects = await prisma.contact.findMany({ where: { kind: "ARCHITECT" }, select: { id: true, firstName: true, lastName: true, title: true, companyId: true } });
  const templates = await prisma.messageTemplate.findMany({ where: { language: "en" } });
  const tpl = (code: string) => templates.find((t) => t.code === code)!;

  // ---------- plan ----------
  const times = creationTimes(rng, now);
  const plans: LeadPlan[] = times.map((createdAt, i) => {
    const ageDays = (now.getTime() - createdAt.getTime()) / DAY;
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const source = weighted(rng, SOURCE_WEIGHTS);
    // Needs-location mostly in the last 5 days; older ones were resolved and handed over
    let outcome = weighted(rng, [["WOR", 30], ["AND", 30], ["TAR", 10], ["PUN", 8], ["OOA", 7], ["NEEDS", 15]] as const) as Outcome;
    if (outcome === "NEEDS" && ageDays > 5 && rng() < 0.85) outcome = weighted(rng, [["WOR", 40], ["AND", 40], ["TAR", 10], ["PUN", 10]] as const) as Outcome;
    let address: string | null = null;
    let pincode: string | null = null;
    if (outcome === "NEEDS") {
      address = rng() < 0.6 ? null : pick(rng, ["NA", "Mumbai", "-", "multiple projects"]);
    } else {
      const area = pick(rng, AREAS[outcome]);
      const misspelt = MISSPELLINGS[area];
      const text = outcome === "OOA" ? (OOA_TEXT[area] ?? area) : misspelt && rng() < 0.35 ? misspelt : area;
      address = outcome !== "OOA" && rng() < 0.55 ? `Flat ${intBetween(rng, 101, 2304)}, ${pick(rng, SOCIETIES)}, ${text}` : text;
      if (outcome !== "OOA" && rng() < 0.2) pincode = ctx.localities.find((l) => l.name === area)?.pincode ?? null;
    }
    const products = weighted(rng, [[["KITCHEN"], 58], [["KITCHEN", "WARDROBES"], 20], [["WARDROBES"], 8], [["KITCHEN", "WARDROBES", "FURNITURE", "BEDS"], 8], [["APPLIANCES"], 3], [["OTHERS"], 3]] as const) as Product[];
    const { stage, lostReason } = outcome === "OOA" ? { stage: (rng() < 0.6 && ageDays > 5 ? "CLOSED_LOST" : "NEW") as LeadStage, lostReason: ageDays > 5 ? ("OTHERS" as LostReason) : null } : stageFor(rng, ageDays);
    const fixedLost = outcome === "OOA" && stage === "NEW" ? null : lostReason;
    const progressedWithoutLocation = outcome === "NEEDS" && stage !== "NEW" && stage !== "CONTACTED";
    return {
      idx: i,
      createdAt,
      first,
      last,
      phone: syntheticPhone(i + 1),
      email: rng() < 0.8 ? syntheticEmail(first, last, i + 1) : null,
      salutation: rng() < 0.7 ? salutationFor(first, rng() < 0.5) : null,
      source,
      outcome: progressedWithoutLocation ? weighted(rng, [["AND", 50], ["WOR", 50]] as const) : outcome,
      address: progressedWithoutLocation ? pick(rng, AREAS.AND) : address,
      viaDesk: progressedWithoutLocation,
      pincode,
      products,
      priority: weighted(rng, [["HOT", 15], ["WARM", 60], ["COLD", 25]] as const),
      stage,
      lostReason: stage === "CLOSED_LOST" ? (fixedLost ?? "OTHERS") : null,
      architect: rng() < 0.15 || (outcome === "TAR" && rng() < 0.15),
    };
  });

  // 4 returning customers: repeat the phone/name of an older lead
  for (const k of [40, 90, 130, 170]) {
    const orig = plans[k - 30];
    Object.assign(plans[k], { first: orig.first, last: orig.last, phone: orig.phone, email: orig.email, outcome: orig.outcome === "OOA" || orig.outcome === "NEEDS" ? "AND" : orig.outcome, address: orig.address ?? "Andheri West" });
  }
  // §9.8 live-state guarantees don't hold by chance alone — nudge the plan deterministically
  const age = (pl: LeadPlan) => (now.getTime() - pl.createdAt.getTime()) / DAY;
  const routable = (pl: LeadPlan) => ["WOR", "AND", "TAR", "PUN"].includes(pl.outcome) && !pl.viaDesk;
  const newestFirst = [...plans].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  // ≈8 open needs-location leads from the last few days
  newestFirst.filter((pl) => age(pl) < 5).slice(0, 8).forEach((pl, k) => {
    Object.assign(pl, { outcome: "NEEDS", address: k % 3 === 0 ? "NA" : k % 3 === 1 ? null : "Mumbai", pincode: null, stage: k < 5 ? "NEW" : "CONTACTED", lostReason: null, viaDesk: false });
  });
  // ≈5 NEW leads past the first-contact SLA today
  newestFirst.filter((pl) => routable(pl) && age(pl) > 0.08 && age(pl) < 2 && pl.outcome !== "NEEDS").slice(0, 5).forEach((pl) => Object.assign(pl, { stage: "NEW", lostReason: null }));
  // ≈9 won (older leads), the first two old enough to be handed over
  const wonNow = plans.filter((pl) => pl.stage === "CLOSED_WON").length;
  plans
    .filter((pl) => routable(pl) && age(pl) > 20 && pl.stage !== "CLOSED_WON" && (pl.stage === "CLOSED_LOST" || pl.stage === "NEGOTIATION" || pl.stage === "QUOTATION_SENT"))
    // Spread wins so the 30-day conversion isn't empty: alternate recent (20–30 d) and older leads
    .sort((a, b) => (age(a) < 30 ? 0 : 1) - (age(b) < 30 ? 0 : 1) || age(b) - age(a))
    .slice(0, Math.max(0, 9 - wonNow))
    .forEach((pl) => Object.assign(pl, { stage: "CLOSED_WON", lostReason: null }));
  // 1–2 revive reminders fire on reset
  const holds = plans.filter((pl) => pl.stage === "CLOSED_LOST" && routable(pl));
  holds.slice(0, 2).forEach((pl) => Object.assign(pl, { lostReason: pl.lostReason === "TIMELINE" ? "TIMELINE" : "ON_HOLD" }));
  const reviveDue = new Set(holds.slice(0, 2).map((pl) => pl.idx));

  // Hero deal
  const hero = plans.find((p) => p.stage === "CLOSED_WON" && p.outcome === "WOR") ?? plans.find((p) => p.stage === "CLOSED_WON");

  // ---------- write ----------
  const rrCursor: Record<string, number> = {};
  let wonSoFar = 0;
  const seq = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('lead_ref_seq') AS n`;
  let ref = Number(seq[0].n);
  const contactsByPhone = new Map<string, string>();
  const leadIdsByPhone = new Map<string, string>();
  let created = 0;

  for (const p of plans) {
    const loc = resolveLocation({ siteAddress: p.address, pincode: p.pincode }, ctx.localities);
    const decision = decideBranch(loc, ctx.branches, ctx.rules, "DIRECT");
    const isNeeds = decision.rule === "NEEDS_LOCATION";
    const isOoa = decision.rule === "OUT_OF_AREA";
    const ecBranch = decision.branchId && branchByCode.ONL?.id !== decision.branchId ? decision.branchId : null;
    const viaDesk = p.viaDesk;
    const branchId = isOoa ? null : isNeeds ? branchByCode.ONL.id : (ecBranch ?? branchByCode.AND.id);
    let ownerId: string | null = null;
    if (branchId) {
      const reps = repsOf(branchId);
      // Arjun carries a heavier load so "overdue by rep" tells a story
      const pool = arjun && branchId === arjun.branchId && rng() < 0.35 ? [arjun] : reps;
      const i = (rrCursor[branchId] = ((rrCursor[branchId] ?? -1) + 1) % Math.max(pool.length, 1));
      ownerId = pool[i]?.id ?? managerOf(branchId)?.id ?? null;
    }
    const deskUser = presales.length ? presales[p.idx % presales.length] : null;
    const ageDays = (now.getTime() - p.createdAt.getTime()) / DAY;
    const refCode = `EL-${ref++}`;
    const architect = p.architect && architects.length ? pick(rng, architects) : null;
    const commission = architect?.title?.match(/([\d.]+)%/)?.[1];
    const est = ["DISCOVERY_MEETING", "QUOTATION_REQUESTED", "QUOTATION_SENT", "NEGOTIATION", "TOKEN_RECEIVED", "CLOSED_WON"].includes(p.stage) || (p.stage === "CLOSED_LOST" && rng() < 0.3)
      ? Math.round(Math.exp(between(rng, Math.log(400000), Math.log(3500000))) / 10000) * 10000
      : null;
    const order = p.stage === "CLOSED_WON" ? (p === hero ? 4800000 : Math.round(between(rng, 800000, 3500000) / 10000) * 10000) : null;
    const priorDup = leadIdsByPhone.get(p.phone) ?? null;

    let contactId = contactsByPhone.get(p.phone);
    if (!contactId) {
      const c = await prisma.contact.create({ data: { kind: "CUSTOMER", firstName: p.first, lastName: p.last, email: p.email, phone: p.phone, phoneE164: p.phone, ownerId, createdAt: p.createdAt } });
      contactId = c.id;
      contactsByPhone.set(p.phone, contactId);
    }

    const stageChangedAt =
      p.stage === "NEW"
        ? p.createdAt
        : p.stage === "CLOSED_WON"
          ? new Date(p.createdAt.getTime() + Math.min(ageDays * 0.3, 12) * DAY)
          : new Date(p.createdAt.getTime() + between(rng, 0.5, Math.max(0.6, ageDays * 0.8)) * DAY);
    const reviveAt =
      p.lostReason === "ON_HOLD" || p.lostReason === "TIMELINE"
        ? new Date(now.getTime() + (reviveDue.has(p.idx) ? -intBetween(rng, 1, 3) : intBetween(rng, 5, 40)) * DAY)
        : null;
    const handedOverAt = viaDesk ? new Date(p.createdAt.getTime() + between(rng, 0.1, 1.5) * DAY) : null;
    const contacted = p.stage !== "NEW";
    const lastActivityAt = new Date(Math.min(now.getTime() - 3600_000, stageChangedAt.getTime() + between(rng, 0, 2) * DAY));

    const lead = await prisma.lead.create({
      data: {
        refCode,
        contactId,
        salutation: p.salutation,
        firstName: p.first,
        lastName: p.last,
        phoneE164: p.phone,
        email: p.email,
        siteAddressRaw: p.address,
        pincode: loc.pincode,
        localityId: (loc.locality as { id?: string } | null)?.id ?? null,
        city: loc.locality?.city ?? null,
        lat: loc.lat,
        lng: loc.lng,
        geoMethod: loc.method,
        geoConfidence: loc.confidence,
        locationStatus: isOoa ? "OUT_OF_AREA" : isNeeds ? "NEEDS_LOCATION" : "RESOLVED",
        branchId,
        ownerId: isNeeds ? (deskUser?.id ?? null) : ownerId,
        handedOverById: viaDesk ? (deskUser?.id ?? null) : null,
        handedOverAt,
        assignedAt: p.createdAt,
        stage: p.stage,
        stageChangedAt,
        lostReason: p.lostReason,
        lostNote: isOoa && p.stage === "CLOSED_LOST" ? "Out of service area" : null,
        reviveAt,
        products: p.products,
        priority: p.priority,
        possessionDate: rng() < 0.5 ? new Date(p.createdAt.getTime() + intBetween(rng, 30, 300) * DAY) : null,
        estimatedValueInr: est,
        orderValueInr: order,
        architectId: architect?.id ?? null,
        architectCommissionPct: commission ? Number(commission) : null,
        source: p.source,
        intakeChannel: p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? "META_LEAD_AD" : p.source === "WEBSITE" ? "WEBSITE_FORM" : p.source === "WHATSAPP" ? "WHATSAPP" : "MANUAL",
        campaignName: p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? campaignForMonth(MONTH(p.createdAt)) : null,
        adsetName: p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? (p.outcome === "PUN" ? CAMPAIGN_ADSETS[2] : pick(rng, CAMPAIGN_ADSETS.slice(0, 2))) : null,
        adName: p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? pick(rng, CAMPAIGN_ADS) : null,
        formName: p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? CAMPAIGN_FORM : null,
        platform: p.source === "FACEBOOK" ? "fb" : p.source.startsWith("INSTAGRAM") ? "ig" : null,
        externalId: p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? `DEMO-${DEMO_SEED}-${p.idx}` : null,
        duplicateOfId: priorDup,
        isReturning: !!priorDup,
        lastActivityAt: contacted ? lastActivityAt : p.createdAt,
        firstContactedAt: contacted ? new Date(p.createdAt.getTime() + between(rng, 0.02, 0.4) * DAY) : null,
        createdAt: p.createdAt,
      },
    });
    leadIdsByPhone.set(p.phone, lead.id);
    created++;

    // Routing decision + base timeline
    const leadOwnerId = lead.ownerId;
    const ownerName = users.find((u) => u.id === leadOwnerId)?.name ?? null;
    const branch = ctx.branches.find((b) => b.id === branchId);
    const branchName = branch ? (branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(branch.name)) : null;
    const strategyLine = branch && ownerName ? `${branch.assignmentStrategy === "LEAST_OPEN_LEADS" ? "Fewest open leads" : "Round-robin"} in ${branchName}: ${ownerName}.` : null;
    await prisma.routingDecision.create({
      data: {
        leadId: lead.id,
        inputText: loc.inputText || null,
        geoMethod: loc.method,
        geoConfidence: loc.confidence,
        matchedLabel: loc.label,
        rule: viaDesk ? "MANUAL" : priorDup ? "RETURNING_SAME_OWNER" : decision.rule,
        distanceKm: decision.distanceKm,
        candidates: decision.candidates as unknown as Prisma.InputJsonValue,
        chosenBranchId: branchId,
        chosenUserId: leadOwnerId,
        strategy: branch?.assignmentStrategy ?? null,
        skipped: [],
        explanation: [...decision.explanation, ...(strategyLine ? [strategyLine] : [])],
        createdAt: p.createdAt,
      },
    });

    const acts: Prisma.ActivityCreateManyInput[] = [];
    const at = (d: Date, type: ActivityType, body: string, extra: Partial<Prisma.ActivityCreateManyInput> = {}) => acts.push({ leadId: lead.id, type, body, createdAt: d, ...extra });
    const t0 = p.createdAt.getTime();
    at(new Date(t0), "SYSTEM", `Lead received from ${p.source === "INSTAGRAM_PAID" || p.source === "FACEBOOK" ? (p.source === "FACEBOOK" ? "Facebook lead ad" : "Instagram lead ad") : "manual entry"} · ${p.source.replace(/_/g, " ").toLowerCase()}`);
    at(new Date(t0 + 10), "ROUTING", decision.explanation.join("\n"));
    if (ownerName && !viaDesk) at(new Date(t0 + 20), "ASSIGNMENT", `Assigned to ${ownerName} (${branchName}).${strategyLine ? `\n${strategyLine}` : ""}`);
    if (viaDesk && handedOverAt) at(handedOverAt, "HANDOVER", `Handed over to ${branchName} → ${ownerName} by ${deskUser?.name ?? "Online Desk"}.`, { userId: deskUser?.id });

    // Welcome message (simulated, delivered/read)
    const msgs: Prisma.OutboundMessageCreateManyInput[] = [];
    if (!isOoa) {
      const code = isNeeds || viaDesk ? "welcome_no_location" : "welcome_enquiry";
      const body = renderTemplate(tpl(code).body, { name: p.first, product: productPhrase(p.products), branch: branchName ?? "nearest", rep_name: ownerName ?? "our team" });
      const mAt = new Date(t0 + 4000);
      msgs.push({ leadId: lead.id, templateCode: code, language: "en", toPhone: p.phone, body, status: rng() < 0.7 ? "READ" : "DELIVERED", provider: "SIMULATOR", providerMessageId: `SIM-DEMO-${p.idx}`, createdAt: mAt, dedupeKey: `WELCOME:${lead.id}` });
      at(mAt, "MESSAGE_SENT", `WhatsApp "${tpl(code).name}" (EN) sent · Simulator`);
    }

    // Activities per stage reached
    const reachedIdx = ["NEW", "CONTACTED", "QUALIFIED", "DISCOVERY_MEETING", "QUOTATION_REQUESTED", "QUOTATION_SENT", "NEGOTIATION", "TOKEN_RECEIVED", "CLOSED_WON"].indexOf(p.stage === "CLOSED_LOST" ? "CONTACTED" : p.stage);
    const span = Math.max(stageChangedAt.getTime() - t0, 3600_000);
    const step = (k: number) => new Date(Math.min(now.getTime() - 600_000, t0 + (span * k) / Math.max(reachedIdx + 1, 2)));
    const vars = {
      bhk: pick(rng, ["2BHK", "3BHK", "4BHK", "1BHK"]),
      area: loc.locality?.name ?? "the site",
      month: new Date(now.getTime() + intBetween(rng, 30, 240) * DAY).toLocaleString("en-IN", { month: "long", timeZone: "Asia/Kolkata" }),
      branch: branchName ?? "Worli",
      architect: architect ? `${architect.firstName} ${architect.lastName}` : "Kaavya Rao",
      budget: String(intBetween(rng, 6, 30)),
      weekday: pick(rng, ["Monday", "Wednesday", "Friday"]),
      date: new Date(now.getTime() + intBetween(rng, 3, 20) * DAY).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
    };
    const callOutcome = (): CallOutcome => weighted(rng, [["CONNECTED", 45], ["NO_ANSWER", 35], ["BUSY", 8], ["SWITCHED_OFF", 4], ["CALLBACK_REQUESTED", 8]] as const);
    const actor = leadOwnerId ?? undefined;
    if (p.stage === "CLOSED_LOST" && p.lostReason === "NO_RESPONSE") {
      const n = intBetween(rng, 3, 4);
      for (let k = 0; k < n; k++) at(new Date(t0 + (k + 1) * 2.5 * DAY > now.getTime() ? now.getTime() - (n - k) * 3600_000 : t0 + (k + 1) * 2.5 * DAY), "CALL", "Call: No answer", { callOutcome: "NO_ANSWER", userId: actor });
      const cl = new Date(Math.min(now.getTime() - 3600_000, t0 + 10 * DAY));
      const body = renderTemplate(tpl("close_the_loop").body, { name: p.first });
      msgs.push({ leadId: lead.id, templateCode: "close_the_loop", language: "en", toPhone: p.phone, body, status: "READ", provider: "SIMULATOR", createdAt: cl, sentById: actor });
      at(cl, "MESSAGE_SENT", `WhatsApp "Close the loop" (EN) sent · Simulator`, { userId: actor });
    } else if (contacted) {
      for (let k = 1; k <= Math.max(1, reachedIdx); k++) {
        const o = k === 1 ? callOutcome() : "CONNECTED";
        at(step(k - 0.5), "CALL", `Call: ${o.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}`, { callOutcome: o, userId: actor });
        if (rng() < 0.75) at(step(k - 0.3), "NOTE", fillSnippet(pick(rng, NOTE_SNIPPETS), vars), { userId: actor });
        const stageName = ["NEW", "CONTACTED", "QUALIFIED", "DISCOVERY_MEETING", "QUOTATION_REQUESTED", "QUOTATION_SENT", "NEGOTIATION", "TOKEN_RECEIVED", "CLOSED_WON"][k] as LeadStage | undefined;
        if (stageName && k <= reachedIdx) at(step(k), "STAGE_CHANGE", `Stage: ${STAGE_LABEL[["NEW", "CONTACTED", "QUALIFIED", "DISCOVERY_MEETING", "QUOTATION_REQUESTED", "QUOTATION_SENT", "NEGOTIATION", "TOKEN_RECEIVED"][k - 1] as LeadStage]} → ${STAGE_LABEL[stageName]}`, { userId: actor });
      }
      if (p.stage === "CLOSED_LOST") at(stageChangedAt, "STAGE_CHANGE", `Stage → ${stageLabel("CLOSED_LOST", p.lostReason)}`, { userId: actor });
    }
    await prisma.activity.createMany({ data: acts });
    if (msgs.length) await prisma.outboundMessage.createMany({ data: msgs });

    // DISCOVERY+ → a past visit at their branch
    if (reachedIdx >= 3 && branchId && branch?.kind === "EXPERIENCE_CENTRE" && p.stage !== "CLOSED_LOST") {
      const v = step(3);
      await prisma.appointment.create({ data: { leadId: lead.id, branchId, hostId: leadOwnerId, scheduledAt: v, status: "VISITED", createdAt: new Date(v.getTime() - 2 * DAY) } });
      await prisma.activity.create({ data: { leadId: lead.id, type: "SHOWROOM_VISIT", body: `Visited ${branch.name}.`, userId: actor, createdAt: new Date(v.getTime() + 3600_000) } });
    }

    // Won → deal + project at a varied execution stage
    if (p.stage === "CLOSED_WON" && branchId) {
      await prisma.deal.create({
        data: {
          title: `${p.products.map((x) => x.charAt(0) + x.slice(1).toLowerCase()).join(" + ")} — ${p.first} ${p.last} (${refCode})`,
          amount: (order ?? 0) * 100,
          stage: "WON",
          closeDate: stageChangedAt,
          contactId,
          companyId: architect?.companyId ?? null,
          ownerId: leadOwnerId,
          leadId: lead.id,
          createdAt: stageChangedAt,
        },
      });
      // Oldest wins are furthest along: two handed over, the rest spread across the 8 site stages
      const stageIdx = PROJECT_SPREAD[Math.min(wonSoFar++, PROJECT_SPREAD.length - 1)];
      const history = PROJECT_STAGES.slice(0, stageIdx + 1).map((s, k) => ({ stage: s, at: new Date(Math.min(now.getTime() - DAY, stageChangedAt.getTime() + k * 5 * DAY)).toISOString() }));
      const handover = stageIdx === 7 ? new Date(Math.min(now.getTime() - DAY, stageChangedAt.getTime() + 42 * DAY)) : null;
      await prisma.project.create({
        data: {
          leadId: lead.id,
          branchId,
          designerId: leadOwnerId,
          supervisorId: managerOf(branchId)?.id ?? null,
          stage: PROJECT_STAGES[stageIdx] as ProjectStage,
          stageHistory: history,
          expectedHandoverAt: new Date(stageChangedAt.getTime() + 60 * DAY),
          handoverAt: handover,
          warrantyEndsAt: handover ? new Date(handover.getTime() + 5 * 365.25 * DAY) : null,
          createdAt: stageChangedAt,
        },
      });
    }
  }
  await prisma.$executeRawUnsafe(`SELECT setval('lead_ref_seq', ${ref - 1})`);
  log(`Leads: ${created}`);

  // ---------- live-state guarantees (§9.8) ----------
  await shapeLiveState(rng, now, wh, owner.id, log);
}

/** Tasks, appointments and messages that make the demo look alive "today". */
async function shapeLiveState(rng: Rng, now: Date, wh: Parameters<typeof addWorkingMinutes>[2], ownerId: string, log: (s: string) => void) {
  const open = await prisma.lead.findMany({
    where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] }, ownerId: { not: null } },
    include: { owner: { select: { email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  const tasks: Prisma.TaskCreateManyInput[] = [];
  const todayEnd = startOfIstDay(now, 1);
  const ageH = (l: { createdAt: Date }) => (now.getTime() - l.createdAt.getTime()) / 3600_000;

  // NEW leads: first-call tasks; the ones older than the SLA show as breached today
  const fresh = open.filter((l) => l.stage === "NEW" && l.locationStatus === "RESOLVED");
  for (const l of fresh) {
    tasks.push({ leadId: l.id, assigneeId: l.ownerId!, type: "FIRST_CALL", title: `First call: ${l.firstName} ${l.lastName ?? ""}`.trim(), dueAt: addWorkingMinutes(l.createdAt, 60, wh), createdAt: l.createdAt });
  }
  // Needs-location: capture tasks for the Online Desk
  for (const l of open.filter((x) => x.locationStatus === "NEEDS_LOCATION")) {
    tasks.push({ leadId: l.id, assigneeId: l.ownerId!, type: "CAPTURE_LOCATION", title: `Call ${l.firstName} to get the site area / pincode`, dueAt: addWorkingMinutes(l.createdAt, 60, wh), createdAt: l.createdAt });
  }
  // Follow-ups: ~10 overdue spread across reps (Arjun most), ~12 today, ~25 upcoming
  const worked = open.filter((l) => l.stage !== "NEW" && l.locationStatus === "RESOLVED" && ageH(l) > 24);
  const quotas: Record<string, number> = { "arjun@elementra.test": 4, "meera@elementra.test": 2, "ishita@elementra.test": 1, "rohan@elementra.test": 1, "dev@elementra.test": 1, "omkar@elementra.test": 1 };
  const overdue: typeof worked = [];
  for (const [email, n] of Object.entries(quotas)) overdue.push(...worked.filter((l) => l.owner?.email === email).slice(0, n));
  for (const l of overdue) {
    const due = new Date(now.getTime() - intBetween(rng, 3, 70) * 3600_000);
    tasks.push({ leadId: l.id, assigneeId: l.ownerId!, type: l.stage === "QUOTATION_SENT" ? "QUOTATION_FOLLOW_UP" : "FOLLOW_UP", title: `Follow up with ${l.firstName}`, dueAt: due, createdAt: new Date(due.getTime() - 2 * DAY) });
  }
  const rest = worked.filter((l) => !overdue.includes(l));
  const shuffled = rest.map((l) => ({ l, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.l);
  for (const l of shuffled.slice(0, 12)) {
    const hour = intBetween(rng, 11, 19);
    let due = wallTime(now, `${hour}:00`);
    if (due < now) due = new Date(Math.min(todayEnd.getTime() - 60_000, now.getTime() + intBetween(rng, 20, 240) * 60_000));
    tasks.push({ leadId: l.id, assigneeId: l.ownerId!, type: "FOLLOW_UP", title: pick(rng, [`Call ${l.firstName} back`, `Share ballpark with ${l.firstName}`, `Confirm floor plan with ${l.firstName}`, `Follow up with ${l.firstName}`]), dueAt: due, createdAt: new Date(now.getTime() - DAY) });
  }
  for (const l of shuffled.slice(12, 37)) {
    tasks.push({ leadId: l.id, assigneeId: l.ownerId!, type: l.stage === "QUOTATION_SENT" ? "QUOTATION_FOLLOW_UP" : "FOLLOW_UP", title: `Follow up with ${l.firstName}`, dueAt: wallTime(now, `${intBetween(rng, 11, 18)}:00`, "Asia/Kolkata", intBetween(rng, 1, 7)), createdAt: new Date(now.getTime() - DAY) });
  }
  // Everyone else has a nurture follow-up further out (long possession cycles) — except a handful the
  // stale-stage rule (R3) will pick up on the first engine run
  for (const l of shuffled.slice(41)) {
    tasks.push({ leadId: l.id, assigneeId: l.ownerId!, type: "FOLLOW_UP", title: `Check in with ${l.firstName} on possession / plans`, dueAt: wallTime(now, "11:30", "Asia/Kolkata", intBetween(rng, 9, 35)), createdAt: new Date(now.getTime() - 2 * DAY) });
  }
  await prisma.task.createMany({ data: tasks });
  for (const leadId of new Set(tasks.map((t) => t.leadId!))) {
    const first = tasks.filter((t) => t.leadId === leadId).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
    await prisma.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: first.dueAt } });
  }

  // Out-of-area leads waiting in the queue get review tasks for the owner
  const ooa = await prisma.lead.findMany({ where: { locationStatus: "OUT_OF_AREA", stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } });
  await prisma.task.createMany({ data: ooa.map((l) => ({ leadId: l.id, assigneeId: ownerId, type: "OUT_OF_AREA_REVIEW" as const, title: `Out of area: ${l.firstName} — accept or regret`, dueAt: addWorkingMinutes(l.createdAt, 240, wh), createdAt: l.createdAt })) });

  // ~6 visits in the next 3 days, one tomorrow 11:00 at Worli
  const candidates = open.filter((l) => ["QUALIFIED", "DISCOVERY_MEETING", "QUOTATION_REQUESTED"].includes(l.stage) && l.branchId && l.locationStatus === "RESOLVED");
  const worliBranch = await prisma.branch.findUnique({ where: { code: "WOR" } });
  const worliLead = candidates.find((l) => l.branchId === worliBranch?.id);
  const slots: [number, string][] = [[1, "11:00"], [0, "17:30"], [1, "15:00"], [2, "12:00"], [2, "16:30"], [3, "11:30"]];
  const picks = [worliLead, ...candidates.filter((l) => l !== worliLead)].filter(Boolean).slice(0, 6);
  for (let k = 0; k < picks.length; k++) {
    const l = picks[k]!;
    let at = wallTime(now, slots[k][1], "Asia/Kolkata", slots[k][0]);
    if (at < now) at = wallTime(now, "18:30", "Asia/Kolkata", 1);
    await prisma.appointment.create({ data: { leadId: l.id, branchId: l.branchId!, hostId: l.ownerId, scheduledAt: at, status: "SCHEDULED", createdAt: new Date(now.getTime() - DAY) } });
    await prisma.activity.create({ data: { leadId: l.id, type: "APPOINTMENT", body: `Showroom visit booked for ${at.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`, userId: l.ownerId, createdAt: new Date(now.getTime() - DAY) } });
  }

  // A few recent manual WhatsApp nudges so the inbox has fresh traffic (~25 in the last week incl. welcomes)
  const nudge = await prisma.messageTemplate.findUnique({ where: { code_language: { code: "follow_up_nudge", language: "en" } } });
  if (nudge) {
    for (const l of shuffled.slice(37, 45)) {
      const at = new Date(now.getTime() - intBetween(rng, 2, 140) * 3600_000);
      await prisma.outboundMessage.create({ data: { leadId: l.id, templateCode: "follow_up_nudge", language: "en", toPhone: l.phoneE164!, body: renderTemplate(nudge.body, { name: l.firstName, product: productPhrase(l.products), branch: "our" }), status: rng() < 0.6 ? "READ" : "DELIVERED", provider: "SIMULATOR", sentById: l.ownerId, createdAt: at } });
    }
  }
  log(`Tasks: ${tasks.length + ooa.length} · Visits booked: ${picks.length}`);
}

/** Deletes demo rows (spec §15.3). Users, branches, localities, templates, settings and architects stay. */
export async function clearDemoData() {
  // Customer contacts created for leads go with them; contacts added by hand (and architects) stay
  const leadContacts = (await prisma.lead.findMany({ where: { contactId: { not: null } }, select: { contactId: true }, distinct: ["contactId"] })).map((l) => l.contactId!);
  await prisma.$transaction([
    prisma.notification.deleteMany({}),
    prisma.outboundMessage.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.appointment.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.deal.deleteMany({ where: { leadId: { not: null } } }),
    prisma.activity.deleteMany({ where: { leadId: { not: null } } }),
    prisma.routingDecision.deleteMany({}),
    prisma.lead.updateMany({ data: { duplicateOfId: null } }),
    prisma.lead.deleteMany({}),
    prisma.contact.deleteMany({ where: { id: { in: leadContacts }, kind: "CUSTOMER", deals: { none: {} } } }),
    prisma.importJob.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.appSetting.deleteMany({ where: { key: "engine.lastRun" } }),
    prisma.user.updateMany({ data: { lastAssignedAt: null, onLeave: false, onLeaveUntil: null } }),
  ]);
  await prisma.$executeRawUnsafe(`SELECT setval('lead_ref_seq', 1000)`);
}
