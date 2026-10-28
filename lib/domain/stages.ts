import type { LeadStage, LostReason } from "@prisma/client";

// Client's own wording (02_REFERENCE_DATA §1)
export const STAGE_ORDER: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISCOVERY_MEETING",
  "QUOTATION_REQUESTED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "TOKEN_RECEIVED",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export const OPEN_STAGES: LeadStage[] = STAGE_ORDER.slice(0, 8);
export const CLOSED_STAGES: LeadStage[] = ["CLOSED_WON", "CLOSED_LOST"];

export const STAGE_LABEL: Record<LeadStage, string> = {
  NEW: "1. New Lead / Inquiry",
  CONTACTED: "2. Contacted",
  QUALIFIED: "3. Lead Qualified",
  DISCOVERY_MEETING: "4. Discovery / Requirement Meeting",
  QUOTATION_REQUESTED: "5. Quotation Requested",
  QUOTATION_SENT: "6. Quotation Sent",
  NEGOTIATION: "7. Negotiations",
  TOKEN_RECEIVED: "8. Token Received",
  CLOSED_WON: "9. Closed Won",
  CLOSED_LOST: "Closed Lost",
};

// Short labels for chips and kanban headers
export const STAGE_SHORT: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  DISCOVERY_MEETING: "Discovery",
  QUOTATION_REQUESTED: "Quote requested",
  QUOTATION_SENT: "Quotation sent",
  NEGOTIATION: "Negotiation",
  TOKEN_RECEIVED: "Token received",
  CLOSED_WON: "Won",
  CLOSED_LOST: "Lost",
};

export const STAGE_COLOR: Record<LeadStage, string> = {
  NEW: "bg-slate-100 text-slate-700 ring-slate-200",
  CONTACTED: "bg-sky-50 text-sky-700 ring-sky-200",
  QUALIFIED: "bg-blue-50 text-blue-700 ring-blue-200",
  DISCOVERY_MEETING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  QUOTATION_REQUESTED: "bg-violet-50 text-violet-700 ring-violet-200",
  QUOTATION_SENT: "bg-purple-50 text-purple-700 ring-purple-200",
  NEGOTIATION: "bg-amber-50 text-amber-800 ring-amber-200",
  TOKEN_RECEIVED: "bg-orange-50 text-orange-700 ring-orange-200",
  CLOSED_WON: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED_LOST: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const LOST_REASON_LABEL: Record<LostReason, string> = {
  BUDGET: "Budget",
  COMPETITOR: "Competitor",
  TIMELINE: "Timeline",
  NO_RESPONSE: "No response",
  ON_HOLD: "On hold",
  OTHERS: "Others",
};

export const LOST_REASONS = Object.keys(LOST_REASON_LABEL) as LostReason[];

export function isOpenStage(stage: LeadStage) {
  return OPEN_STAGES.includes(stage);
}

export function stageLabel(stage: LeadStage, lostReason?: LostReason | null) {
  if (stage === "CLOSED_LOST") return lostReason ? `Closed Lost – ${LOST_REASON_LABEL[lostReason]}` : "Closed Lost";
  return STAGE_LABEL[stage];
}

/**
 * Allowed transitions: any open stage → any later open stage, one step back, or Won/Lost.
 * Won/Lost → reopen only for OWNER/ADMIN/MANAGER (checked by the caller via `canReopen`).
 */
export function canTransition(from: LeadStage, to: LeadStage, canReopen = false): boolean {
  if (from === to) return false;
  if (isOpenStage(from)) {
    if (!isOpenStage(to)) return true;
    const fi = STAGE_ORDER.indexOf(from);
    const ti = STAGE_ORDER.indexOf(to);
    return ti > fi || ti === fi - 1;
  }
  return canReopen && isOpenStage(to);
}

/** Legacy sheet value "14. Closed Lost - Others" → { stage, lostReason } */
export function parseLegacyStatus(raw: string): { stage: LeadStage; lostReason?: LostReason } | null {
  const key = raw.replace(/^\s*\d+\s*\.?/, "").toLowerCase().replace(/[\s.\-–]/g, "");
  const map: Record<string, { stage: LeadStage; lostReason?: LostReason }> = {
    newleadinquiry: { stage: "NEW" },
    newlead: { stage: "NEW" },
    contacted: { stage: "CONTACTED" },
    leadqualified: { stage: "QUALIFIED" },
    qualified: { stage: "QUALIFIED" },
    "discovery/requirementmeeting": { stage: "DISCOVERY_MEETING" },
    quotationrequested: { stage: "QUOTATION_REQUESTED" },
    quotationsent: { stage: "QUOTATION_SENT" },
    negotiations: { stage: "NEGOTIATION" },
    tokenreceived: { stage: "TOKEN_RECEIVED" },
    closedwon: { stage: "CLOSED_WON" },
    closedlostbudget: { stage: "CLOSED_LOST", lostReason: "BUDGET" },
    closedlostcompetitor: { stage: "CLOSED_LOST", lostReason: "COMPETITOR" },
    closedlosttimeline: { stage: "CLOSED_LOST", lostReason: "TIMELINE" },
    closedlostnoresponse: { stage: "CLOSED_LOST", lostReason: "NO_RESPONSE" },
    closedlostonhold: { stage: "CLOSED_LOST", lostReason: "ON_HOLD" },
    closedlostothers: { stage: "CLOSED_LOST", lostReason: "OTHERS" },
  };
  return map[key] ?? null;
}
