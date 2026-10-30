// Google Sheets sync — IN_PROGRESS. The mapper for the client's "Sales Pipeline" columns is ready;
// the live connection (service account + polling / Apps Script webhook) waits for sheet access.
import type { IngestInput } from "@/lib/domain/leads/ingest";
import { mapProducts, splitName } from "./metaLead";

export function sheetsConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON && env.GOOGLE_SHEET_ID);
}

/** Client's Source dropdown text → integration key; the Source master maps "sheet:<text>" to a source. */
export function mapSheetSource(raw: string | null | undefined): string {
  return `sheet:${(raw ?? "").trim().replace(/\s+/g, " ")}`;
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

/** `legacyStatus` stays raw text; the import preview matches it to a stage with matchLegacyStatus(). */
export function mapSheetRow(row: SheetRow): IngestInput & { legacyStatus: string | null } {
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
    legacyStatus: row.Status?.trim() || null,
    rawPayload: row,
  };
}
