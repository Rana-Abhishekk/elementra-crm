// Google Sheets sync — IN_PROGRESS. The mapper for the client's "Sales Pipeline" columns is ready;
// the live connection (service account + polling / Apps Script webhook) waits for sheet access.
import type { LeadSource } from "@prisma/client";
import type { IngestInput } from "@/lib/domain/leads/ingest";
import { parseLegacyStatus } from "@/lib/domain/stages";
import { mapProducts, splitName } from "./metaLead";

export function sheetsConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON && env.GOOGLE_SHEET_ID);
}

// Client's Source dropdown → LeadSource (02_REFERENCE_DATA §2)
const SOURCE_MAP: Record<string, LeadSource> = {
  "instagram paid media": "INSTAGRAM_PAID",
  "instagram paid media paid media": "INSTAGRAM_PAID",
  "instagram organic": "INSTAGRAM_ORGANIC",
  facebook: "FACEBOOK",
  google: "GOOGLE",
  whatsapp: "WHATSAPP",
  linkedin: "LINKEDIN",
  reference: "REFERENCE",
  "repeat purchase": "REPEAT_PURCHASE",
  walkins: "WALK_IN",
  "walk-in": "WALK_IN",
  call: "CALL",
  website: "WEBSITE",
};

export function mapSheetSource(raw: string | null | undefined): LeadSource {
  return SOURCE_MAP[(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ")] ?? "INSTAGRAM_PAID";
}

export interface SheetRow {
  "First Name"?: string;
  "Last Name"?: string;
  Name?: string;
  Salutation?: string;
  Phone?: string;
  Email?: string;
  "Site Address"?: string;
  "Product/Solution"?: string;
  Source?: string;
  Status?: string;
  Remarks?: string;
}

export function mapSheetRow(row: SheetRow): IngestInput & { legacyStatus: ReturnType<typeof parseLegacyStatus> } {
  const name = row["First Name"] ? { firstName: row["First Name"], lastName: row["Last Name"] ?? null } : splitName(row.Name ?? "Sheet lead");
  return {
    ...name,
    salutation: row.Salutation ?? null,
    phone: row.Phone ?? null,
    email: row.Email ?? null,
    siteAddress: row["Site Address"] ?? null,
    products: mapProducts(row["Product/Solution"]),
    source: mapSheetSource(row.Source),
    channel: "GOOGLE_SHEET",
    notes: row.Remarks ? `Sheet remarks: ${row.Remarks}` : null,
    legacyStatus: row.Status ? parseLegacyStatus(row.Status) : null,
    rawPayload: row,
  };
}
