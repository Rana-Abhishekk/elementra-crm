import type {
  ActivityType,
  CallOutcome,
  GeoMethod,
  IntakeChannel,
  Priority,
  ProjectStage,
  RoutingRule,
  TaskType,
} from "@prisma/client";

export const CHANNEL_LABEL: Record<IntakeChannel, string> = {
  META_LEAD_AD: "Meta lead ad",
  WEBSITE_FORM: "Website form",
  WHATSAPP: "WhatsApp",
  GOOGLE_SHEET: "Google Sheet",
  CSV_IMPORT: "CSV import",
  MANUAL: "Manual entry",
};

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

