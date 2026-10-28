"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { writeAudit } from "@/lib/domain/audit";
import { ingestLead } from "@/lib/domain/leads/ingest";
import { mapMetaCsvRow } from "@/lib/domain/integrations/metaCsv";

export interface ImportSummary {
  jobId: string;
  total: number;
  created: number;
  duplicates: number;
  failed: number;
  routed: number;
  needsLocation: number;
  outOfArea: number;
  errors: { row: number; error: string }[];
  duplicateRows: { row: number; name: string; note: string }[];
}

const rowsSchema = z.array(z.record(z.string(), z.string())).min(1, "The file has no rows").max(2000, "Import up to 2,000 rows at a time");

export async function importMetaCsvAction(fileName: string, rows: Record<string, string>[]): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
  try {
    const user = await requireRole("OWNER", "ADMIN", "PRESALES");
    const data = rowsSchema.parse(rows);
    const s: Omit<ImportSummary, "jobId"> = { total: data.length, created: 0, duplicates: 0, failed: 0, routed: 0, needsLocation: 0, outOfArea: 0, errors: [], duplicateRows: [] };
    for (const [i, row] of data.entries()) {
      const input = mapMetaCsvRow(row);
      const res = await ingestLead(input, { actorId: user.id, quiet: true });
      const n = i + 2; // spreadsheet row number (header is row 1)
      if (!res.ok) {
        s.failed++;
        s.errors.push({ row: n, error: res.error });
      } else if (res.decision.existing) {
        s.duplicates++;
        s.duplicateRows.push({ row: n, name: res.decision.name, note: `Already imported as ${res.decision.refCode}` });
      } else {
        s.created++;
        if (res.decision.duplicateOf) s.duplicateRows.push({ row: n, name: res.decision.name, note: `Same phone as ${res.decision.duplicateOf} — linked as a returning customer` });
        if (res.lead.locationStatus === "NEEDS_LOCATION") s.needsLocation++;
        else if (res.lead.locationStatus === "OUT_OF_AREA") s.outOfArea++;
        else s.routed++;
      }
    }
    const job = await prisma.importJob.create({
      data: { fileName, kind: "META_CSV", totalRows: s.total, created: s.created, duplicates: s.duplicates, failed: s.failed, errors: s.errors, createdById: user.id },
    });
    await writeAudit({ actorId: user.id, action: "import.meta_csv", entityType: "ImportJob", entityId: job.id, summary: `${fileName}: ${s.created} created, ${s.duplicates} duplicates, ${s.failed} failed` });
    revalidatePath("/dashboard", "layout");
    return { ok: true, summary: { jobId: job.id, ...s } };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Import failed" };
  }
}
