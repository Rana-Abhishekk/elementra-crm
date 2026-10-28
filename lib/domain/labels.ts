import type {
  ActivityType,
  CallOutcome,
  GeoMethod,
  IntakeChannel,
  LeadSource,
  Priority,
  Product,
  ProjectStage,
  Role,
  RoutingRule,
  TaskType,
} from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales manager",
  PRESALES: "Online Desk",
  SALES_REP: "Sales rep",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  INSTAGRAM_PAID: "Instagram (Paid)",
  INSTAGRAM_ORGANIC: "Instagram (Organic)",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  WHATSAPP: "WhatsApp",
  LINKEDIN: "LinkedIn",
  REFERENCE: "Reference / Architect",
  REPEAT_PURCHASE: "Repeat purchase",
  WALK_IN: "Walk-in",
  CALL: "Phone call",
  WEBSITE: "Website",
};
export const SOURCES = Object.keys(SOURCE_LABEL) as LeadSource[];

export const CHANNEL_LABEL: Record<IntakeChannel, string> = {
  META_LEAD_AD: "Meta lead ad",
  WEBSITE_FORM: "Website form",
  WHATSAPP: "WhatsApp",
  GOOGLE_SHEET: "Google Sheet",
  CSV_IMPORT: "CSV import",
  MANUAL: "Manual entry",
};

export const PRODUCT_LABEL: Record<Product, string> = {
  KITCHEN: "Kitchen",
  WARDROBES: "Wardrobes",
  FURNITURE: "Furniture",
  APPLIANCES: "Appliances",
  BEDS: "Beds",
  OTHERS: "Others",
};
export const PRODUCTS = Object.keys(PRODUCT_LABEL) as Product[];

export const PRIORITY_LABEL: Record<Priority, string> = { HOT: "Hot", WARM: "Warm", COLD: "Cold" };
export const PRIORITY_COLOR: Record<Priority, string> = {
  HOT: "bg-rose-50 text-rose-700 ring-rose-200",
  WARM: "bg-amber-50 text-amber-800 ring-amber-200",
  COLD: "bg-sky-50 text-sky-700 ring-sky-200",
};

export const GEO_METHOD_LABEL: Record<GeoMethod, string> = {
  PINCODE: "Pincode",
  ALIAS: "Locality name",
  FUZZY: "Spelling-tolerant match",
  GOOGLE: "Google Maps",
  MANUAL: "Set by hand",
  NONE: "Not found",
};

export const RULE_LABEL: Record<RoutingRule, string> = {
  PINCODE_RULE: "Pincode rule",
  NEAREST_IN_RADIUS: "Nearest branch in radius",
  OUT_OF_AREA: "Out of area",
  NEEDS_LOCATION: "Needs location",
  VIA_PRESALES: "Via Online Desk",
  RETURNING_SAME_OWNER: "Returning customer → same owner",
  MANUAL: "Manual",
};

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  CONNECTED: "Connected",
  NO_ANSWER: "No answer",
  BUSY: "Busy",
  SWITCHED_OFF: "Switched off",
  WRONG_NUMBER: "Wrong number",
  CALLBACK_REQUESTED: "Callback requested",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  FIRST_CALL: "First call",
  FOLLOW_UP: "Follow-up",
  CAPTURE_LOCATION: "Capture location",
  APPOINTMENT_PREP: "Visit prep",
  VISIT_OUTCOME: "Visit outcome",
  QUOTATION_FOLLOW_UP: "Quotation follow-up",
  REVIVE: "Revive",
  ESCALATION: "Escalation",
  OUT_OF_AREA_REVIEW: "Out-of-area review",
  OTHER: "Task",
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  TASK: "Task",
  WHATSAPP: "WhatsApp",
  SHOWROOM_VISIT: "Showroom visit",
  STAGE_CHANGE: "Stage change",
  ASSIGNMENT: "Assignment",
  HANDOVER: "Handover",
  FOLLOW_UP_SET: "Follow-up set",
  MESSAGE_SENT: "Message",
  APPOINTMENT: "Appointment",
  ROUTING: "Routing",
  SYSTEM: "System",
};

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
  MEASUREMENT_REVERIFY: "Re-verify measurement",
  CIVIL_WORK: "Civil work in progress",
  PRODUCTION_MEASUREMENT: "Re-verify measurement for production",
  ORDER_SENT_TO_FACTORY: "Order sent to factory",
  MATERIAL_DELIVERED: "Material delivered",
  INSTALLATION: "Installation in progress",
  CLEANING: "Cleaning",
  HANDOVER: "Handover",
};
export const PROJECT_STAGES = Object.keys(PROJECT_STAGE_LABEL) as ProjectStage[];

/** "Kitchen and wardrobes" style, for templates ({{product}}) */
export function productPhrase(products: Product[]): string {
  const names = (products.length ? products : ["KITCHEN" as Product]).map((p) => PRODUCT_LABEL[p].toLowerCase());
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
