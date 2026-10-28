// Meta leadgen webhook processing (spec §11). Demo payloads embed `simulated_lead`; real ones carry
// only ids and are fetched from the Graph API (stub until connected).
import { createHmac, timingSafeEqual } from "node:crypto";
import { ingestLead, type DecisionSummary } from "@/lib/domain/leads/ingest";
import { fetchMetaLead, mapMetaLead, type MetaGraphLead } from "./metaLead";

export interface LeadgenPayload {
  object?: string;
  entry?: {
    id?: string;
    time?: number;
    changes?: { field: string; value: { leadgen_id: string; page_id?: string; form_id?: string; ad_id?: string; created_time?: number; simulated_lead?: MetaGraphLead } }[];
  }[];
}

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const given = header.slice(7);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function processLeadgenPayload(payload: LeadgenPayload) {
  const results: ({ leadgenId: string } & ({ ok: true; decision: DecisionSummary } | { ok: false; error: string }))[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value.leadgen_id;
      try {
        const lead = change.value.simulated_lead ?? (await fetchMetaLead(leadgenId));
        const res = await ingestLead(mapMetaLead({ ...lead, id: lead.id ?? leadgenId }));
        results.push(res.ok ? { leadgenId, ok: true, decision: res.decision } : { leadgenId, ok: false, error: res.error });
      } catch (e) {
        results.push({ leadgenId, ok: false, error: e instanceof Error ? e.message : "Failed" });
      }
    }
  }
  return results;
}

/** Wrap a Graph lead in the webhook envelope Meta sends (used by the demo panel and "Send test webhook"). */
export function simulatedEnvelope(lead: MetaGraphLead): LeadgenPayload {
  const t = Math.floor(Date.now() / 1000);
  return {
    object: "page",
    entry: [{ id: "100000000000001", time: t, changes: [{ field: "leadgen", value: { leadgen_id: lead.id, page_id: "100000000000001", form_id: "900000000000001", created_time: t, simulated_lead: lead } }] }],
  };
}
