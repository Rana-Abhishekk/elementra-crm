// Meta Leads Center CSV export row → IngestInput (02_REFERENCE_DATA §7.3).
import type { IngestInput } from "@/lib/domain/leads/ingest";
import { mapProducts, metaSource, parsePriority, splitName } from "./metaLead";

const KNOWN = new Set([
  "id", "created_time", "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name", "form_id", "form_name",
  "is_organic", "platform", "elementra_bespoke_products_you_are_looking_for", "full_name", "email", "phone_number", "lead_status", "priority",
]);

/** Strip Meta's type prefixes: l:, ag:, as:, c:, f:, p: */
export function stripPrefix(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^(l|ag|as|c|f|p):/i, "").trim();
}

export function mapMetaCsvRow(row: Record<string, string>): IngestInput {
  const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), (v ?? "").trim()]));
  const name = splitName(r.full_name || "Meta lead");
  const created = r.created_time ? new Date(r.created_time) : undefined;
  const extras = Object.fromEntries(Object.entries(r).filter(([k]) => !KNOWN.has(k) && r[k]));
  return {
    firstName: name.firstName,
    lastName: name.lastName,
    phone: stripPrefix(r.phone_number) || null,
    email: r.email || null,
    siteAddress: r.site_area || r.city || r.site_address || r.location || null,
    pincode: r.site_pincode || r.pincode || null,
    products: mapProducts(r.elementra_bespoke_products_you_are_looking_for),
    source: metaSource(r.platform, r.is_organic),
    channel: "CSV_IMPORT",
    platform: r.platform || null,
    campaignName: r.campaign_name || null,
    adsetName: r.adset_name || null,
    adName: r.ad_name || null,
    formName: r.form_name || null,
    externalId: stripPrefix(r.id) || null,
    priority: parsePriority(r.priority),
    receivedAt: created && !Number.isNaN(created.getTime()) ? created : undefined,
    rawPayload: { ...row, ...(Object.keys(extras).length ? { _unmapped: extras } : {}) },
  };
}
