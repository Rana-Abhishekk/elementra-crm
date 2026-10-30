// The 10 named demo scenarios (02_REFERENCE_DATA §8) + a random burst. Each goes through the real
// entry point for its channel (Meta webhook processor, website form path, manual ingest).
import { prisma } from "@/lib/prisma";
import { ingestLead, type DecisionSummary, type IngestInput } from "@/lib/domain/leads/ingest";
import { processLeadgenPayload, simulatedEnvelope } from "@/lib/domain/integrations/metaWebhook";
import type { MetaGraphLead } from "@/lib/domain/integrations/metaLead";
import { wallTime } from "@/lib/domain/time";
import { writeAudit } from "@/lib/domain/audit";
import { CAMPAIGN_ADSETS, CAMPAIGN_FORM, FIRST_NAMES, LAST_NAMES, SOCIETIES, SOURCE_WEIGHTS, syntheticEmail, syntheticPhone } from "./pools";
import { mulberry32, pick, weighted } from "./prng";

export const SCENARIOS = [
  { id: 1, title: "Instagram ad — Worli flat", hint: "Pincode 400018 → Worli, round-robin" },
  { id: 2, title: "Misspelt suburb", hint: "\"goregoan east\" → fuzzy → Andheri" },
  { id: 3, title: "Navi Mumbai pincode rule", hint: "Vashi 400703 → Worli by rule" },
  { id: 4, title: "Pune enquiry", hint: "Baner → Pune" },
  { id: 5, title: "Out of area — Surat", hint: "→ Out-of-area queue" },
  { id: 6, title: "Borderline — Panvel", hint: "31.8 km, just outside Worli's radius" },
  { id: 7, title: "No location (typical Meta form)", hint: "→ Online Desk, ask for area" },
  { id: 8, title: "Returning customer", hint: "Phone matches an open lead → same owner" },
  { id: 9, title: "Night lead", hint: "23:40 IST → call due 11:00 next morning" },
  { id: 10, title: "Rep on leave", hint: "Arjun on leave → Meera gets it" },
  { id: 11, title: "Full-home enquiry", hint: "Full Home Interiors → Turnkey pipeline" },
] as const;

export type ScenarioResult = { ok: true; decision: DecisionSummary } | { ok: false; error: string };

/** Fresh synthetic phone in a range the history generator never uses (+91 90000 5xxxx–7xxxx). */
async function freshPhone(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const phone = syntheticPhone(50000 + Math.floor(Math.random() * 30000));
    if (!(await prisma.lead.findFirst({ where: { phoneE164: phone }, select: { id: true } }))) return phone;
  }
  return syntheticPhone(50000 + Math.floor(Math.random() * 30000));
}

const monthName = (d: Date) => d.toLocaleString("en-IN", { month: "short", timeZone: "Asia/Kolkata" });

function graphLead(o: {
  first: string;
  last: string;
  phone: string;
  product?: string;
  pincode?: string;
  area?: string;
  platform?: "ig" | "fb";
  created?: Date;
}): MetaGraphLead {
  const created = o.created ?? new Date();
  const fields = [
    { name: "full_name", values: [`${o.first} ${o.last}`] },
    { name: "phone_number", values: [o.phone] },
    { name: "email", values: [syntheticEmail(o.first, o.last, Number(o.phone.slice(-3)))] },
    { name: "elementra_bespoke_products_you_are_looking_for", values: [o.product ?? "elementra_kitchens"] },
  ];
  if (o.pincode) fields.push({ name: "site_pincode", values: [o.pincode] });
  if (o.area) fields.push({ name: "site_area", values: [o.area] });
  return {
    id: `SIM-${Math.floor(created.getTime() / 1000)}-${Math.random().toString(36).slice(2, 7)}`,
    created_time: created.toISOString(),
    ad_name: "Trust – Reel",
    adset_name: o.platform === "fb" ? CAMPAIGN_ADSETS[2] : CAMPAIGN_ADSETS[0],
    campaign_name: `Elementra – Leads – ${monthName(created)} 2026`,
    form_name: CAMPAIGN_FORM,
    is_organic: false,
    platform: o.platform ?? "ig",
    field_data: fields,
  };
}

async function viaMeta(lead: MetaGraphLead): Promise<ScenarioResult> {
  const [res] = await processLeadgenPayload(simulatedEnvelope(lead));
  return res.ok ? { ok: true, decision: res.decision } : { ok: false, error: res.error };
}

async function viaIngest(input: IngestInput, actorId: string | null): Promise<ScenarioResult> {
  const res = await ingestLead(input, { actorId });
  return res.ok ? { ok: true, decision: res.decision } : { ok: false, error: res.error };
}

export async function runScenario(id: number, actorId: string | null): Promise<ScenarioResult> {
  const phone = await freshPhone();
  switch (id) {
    case 1:
      // Always "Rhea Kapoor" so the presenter can find her quickly
      return viaMeta(graphLead({ first: "Rhea", last: "Kapoor", phone, pincode: "400018", area: "Flat 1802, Worli Sea Face" }));
    case 2:
      return viaIngest(
        { firstName: "Aditya", lastName: "Shah", phone, email: syntheticEmail("aditya", "shah", 2), siteAddress: "Flat 704, Palm Residency, goregoan east", products: ["Kitchen", "Wardrobes"], source: "web:form", channel: "WEBSITE_FORM" },
        null,
      );
    case 3:
      return viaIngest({ firstName: "Kavya", lastName: "Iyer", phone, siteAddress: "Sector 17, Vashi 400703", products: ["Kitchen"], source: "WhatsApp", channel: "WHATSAPP" }, null);
    case 4:
      return viaMeta(graphLead({ first: "Nikhil", last: "Kulkarni", phone, product: "elementra_wardrobes", area: "Baner, Pune", platform: "fb" }));
    case 5:
      return viaMeta(graphLead({ first: "Pooja", last: "Thakkar", phone, area: "Adajan, Surat, Gujarat" }));
    case 6:
      return viaIngest({ firstName: "Aniket", lastName: "Pawar", phone, siteAddress: "New Panvel 410206", products: ["Kitchen"], source: "web:form", channel: "WEBSITE_FORM" }, null);
    case 7:
      return viaMeta(graphLead({ first: "Ruhi", last: "Menon", phone }));
    case 8: {
      const original = await prisma.lead.findFirst({
        where: { stage: { category: "OPEN" }, ownerId: { not: null }, openPhoneKey: { not: null }, branch: { kind: "EXPERIENCE_CENTRE" } },
        orderBy: { createdAt: "desc" },
        include: { products: { select: { id: true } } },
      });
      if (!original) return { ok: false, error: "No open lead with an owner to repeat — generate demo data first." };
      return viaIngest(
        { firstName: original.firstName, lastName: original.lastName, phone: original.phoneE164, siteAddress: original.siteAddressRaw, products: original.products.map((p) => p.id), source: "Phone call", channel: "MANUAL", notes: "Called the showroom again asking about delivery timelines." },
        actorId,
      );
    }
    case 9: {
      const now = new Date();
      let receivedAt = wallTime(now, "23:40");
      if (receivedAt > now) receivedAt = wallTime(now, "23:40", "Asia/Kolkata", -1);
      return viaMeta(graphLead({ first: "Varun", last: "Sethi", phone, area: "Powai, Hiranandani", created: receivedAt }));
    }
    case 10: {
      const arjun = await prisma.user.findUnique({ where: { email: "arjun@elementra.test" } });
      if (arjun && !arjun.onLeave) {
        await prisma.user.update({ where: { id: arjun.id }, data: { onLeave: true, onLeaveUntil: null } });
        await writeAudit({ actorId, action: "user.on_leave", entityType: "User", entityId: arjun.id, summary: `${arjun.name} marked on leave (demo scenario)` });
      }
      return viaIngest({ firstName: "Ritika", lastName: "Chopra", phone, siteAddress: "Andheri West, Lokhandwala", products: ["Kitchen"], source: "Walk-in", channel: "MANUAL" }, actorId);
    }
    case 11:
      // Product-based pipeline auto-selection (Masters → Pipelines: Turnkey lists Full Home Interiors)
      return viaIngest({ firstName: "Sanjana", lastName: "Bhosale", phone, siteAddress: "Bandra West, Pali Hill", products: ["Full Home Interiors", "Kitchen"], source: "web:form", channel: "WEBSITE_FORM" }, actorId);
    default:
      return { ok: false, error: "Unknown scenario" };
  }
}

const RANDOM_AREAS: readonly (readonly [string | null, number])[] = [
  ["Worli", 6], ["Prabhadevi", 3], ["Lower Parel", 3], ["Dadar West", 3], ["Chembur", 3], ["Bandra West", 3], ["Sector 15, Vashi 400703", 2],
  ["Andheri East", 4], ["Andheri (W)", 3], ["Borivalli west", 3], ["Goregaon West", 3], ["Malad mumbai", 2], ["Powai hiranandani", 3], ["Thane - Ghodbunder", 3],
  ["Peddar Road", 3], ["Malabar Hill", 2], ["Breach Candy", 2],
  ["Baner, Pune", 2], ["Kothrud, Pune", 2], ["Wakad", 2],
  ["Kalyan West", 2], ["Nashik", 1], ["Hyderabad, Telangana", 1],
  [null, 6], ["NA", 2], ["Mumbai", 1],
];

/** 10 realistic leads in one go; returns the toast summary ("7 routed, 2 need location, 1 out of area"). */
export async function runRandomBurst(actorId: string | null, count = 10) {
  const rng = mulberry32(Date.now() % 2147483647);
  const tally = { routed: 0, needsLocation: 0, outOfArea: 0, failed: 0 };
  for (let i = 0; i < count; i++) {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const area = weighted(rng, RANDOM_AREAS);
    const source = weighted(rng, SOURCE_WEIGHTS);
    const products = weighted(rng, [[["prd_kitchen"], 58], [["prd_kitchen", "prd_wardrobes"], 20], [["prd_wardrobes"], 8], [["prd_kitchen", "prd_wardrobes", "prd_furniture"], 8], [["prd_appliances"], 6]] as const) as unknown as string[];
    const phone = await freshPhone();
    const siteAddress = area && area !== "NA" && rng() < 0.5 ? `Flat ${100 + Math.floor(rng() * 1800)}, ${pick(rng, SOCIETIES)}, ${area}` : area;
    const res =
      source === "src_instagram_paid" || source === "src_facebook"
        ? await viaMeta(graphLead({ first, last, phone, area: siteAddress ?? undefined, platform: source === "src_facebook" ? "fb" : "ig", product: products[0] === "prd_wardrobes" ? "elementra_wardrobes" : "elementra_kitchens" }))
        : await viaIngest({ firstName: first, lastName: last, phone, siteAddress, products, source, channel: source === "src_website" ? "WEBSITE_FORM" : source === "src_whatsapp" ? "WHATSAPP" : "MANUAL" }, actorId);
    if (!res.ok) tally.failed++;
    else if (res.decision.rule === "OUT_OF_AREA") tally.outOfArea++;
    else if (res.decision.rule === "NEEDS_LOCATION") tally.needsLocation++;
    else tally.routed++;
  }
  const parts = [`${tally.routed} routed`, `${tally.needsLocation} need location`, `${tally.outOfArea} out of area`];
  if (tally.failed) parts.push(`${tally.failed} failed`);
  return { tally, summary: parts.join(", ") };
}
