// Meta Lead Ads → IngestInput (02_REFERENCE_DATA §7). Works with or without the recommended
// site_pincode / possession_timeline questions.
import type { LeadSource, Priority, Product } from "@prisma/client";
import type { IngestInput } from "@/lib/domain/leads/ingest";

export interface MetaGraphLead {
  id: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
  is_organic?: boolean | string;
  platform?: string;
  field_data?: { name: string; values: string[] }[];
}

const PRODUCT_ANSWERS: Record<string, Product> = {
  elementra_kitchens: "KITCHEN",
  elementra_kitchen: "KITCHEN",
  elementra_wardrobes: "WARDROBES",
  elementra_furniture: "FURNITURE",
  elementra_appliances: "APPLIANCES",
  elementra_beds: "BEDS",
};

/** "elementra_kitchens" or "Kitchen, Wardrobes" → products */
export function mapProducts(raw: string | string[] | null | undefined): Product[] {
  const parts = (Array.isArray(raw) ? raw : [raw ?? ""]).flatMap((v) => v.split(/[,|]/)).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const out = new Set<Product>();
  for (const p of parts) {
    const key = p.replace(/\s+/g, "_");
    const mapped =
      PRODUCT_ANSWERS[key] ??
      PRODUCT_ANSWERS[`elementra_${key}`] ??
      (p.startsWith("kitchen") ? "KITCHEN" : p.startsWith("wardrobe") ? "WARDROBES" : p.startsWith("furniture") ? "FURNITURE" : p.startsWith("appliance") ? "APPLIANCES" : p.startsWith("bed") ? "BEDS" : "OTHERS");
    out.add(mapped);
  }
  return [...out];
}

export function metaSource(platform: string | null | undefined, isOrganic: boolean | string | null | undefined): LeadSource {
  const organic = isOrganic === true || String(isOrganic).toLowerCase() === "true";
  if ((platform ?? "").toLowerCase() === "fb") return "FACEBOOK";
  return organic ? "INSTAGRAM_ORGANIC" : "INSTAGRAM_PAID";
}

export function splitName(full: string): { firstName: string; lastName: string | null } {
  const t = full.trim().replace(/\s+/g, " ");
  const i = t.indexOf(" ");
  return i < 0 ? { firstName: t, lastName: null } : { firstName: t.slice(0, i), lastName: t.slice(i + 1) };
}

const POSSESSION_DAYS: Record<string, number> = {
  ready: 0,
  already_have_possession: 0,
  within_3_months: 75,
  "3_6_months": 135,
  "6_12_months": 270,
  after_12_months: 400,
};

export function possessionFrom(answer: string | undefined, from: Date): Date | null {
  if (!answer) return null;
  const days = POSSESSION_DAYS[answer.toLowerCase()];
  return days === undefined ? null : new Date(from.getTime() + days * 86400_000);
}

export function parsePriority(raw: string | null | undefined): Priority | undefined {
  const v = raw?.trim().toUpperCase();
  return v === "HOT" || v === "WARM" || v === "COLD" ? v : undefined;
}

export function mapMetaLead(lead: MetaGraphLead): IngestInput {
  const f = Object.fromEntries((lead.field_data ?? []).map((d) => [d.name.toLowerCase(), d.values?.[0] ?? ""]));
  const name = f.full_name ? splitName(f.full_name) : { firstName: f.first_name || "Instagram lead", lastName: f.last_name || null };
  const receivedAt = lead.created_time ? new Date(lead.created_time.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")) : undefined;
  return {
    firstName: name.firstName,
    lastName: name.lastName,
    phone: f.phone_number ?? null,
    email: f.email ?? null,
    pincode: f.site_pincode || f.post_code || f.zip_code || null,
    siteAddress: f.site_area || f.street_address || f.city || null,
    products: mapProducts(f.elementra_bespoke_products_you_are_looking_for),
    source: metaSource(lead.platform, lead.is_organic),
    channel: "META_LEAD_AD",
    platform: lead.platform ?? null,
    campaignName: lead.campaign_name ?? null,
    adsetName: lead.adset_name ?? null,
    adName: lead.ad_name ?? null,
    formName: lead.form_name ?? null,
    externalId: lead.id,
    possessionDate: possessionFrom(f.possession_timeline, receivedAt ?? new Date()),
    receivedAt: receivedAt && !Number.isNaN(receivedAt.getTime()) ? receivedAt : undefined,
    rawPayload: lead,
  };
}

/** Real flow: fetch the lead by id from the Graph API. Stub until the client's Meta app is connected. */
export async function fetchMetaLead(leadgenId: string): Promise<MetaGraphLead> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Meta not connected");
  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Meta Graph API error ${res.status}`);
  return (await res.json()) as MetaGraphLead;
}
