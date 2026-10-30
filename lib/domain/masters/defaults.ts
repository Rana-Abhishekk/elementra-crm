// Seed values for the masters (02_REFERENCE_DATA §1–3, 06 §4–5). Only the seed and the Week 1 migration
// read these; at runtime everything comes from the database.
import type { DataScope, StageCategory } from "@prisma/client";
import { ALL_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export interface StageSeed {
  id?: string;
  systemKey: string;
  label: string;
  category: StageCategory;
  color: string;
  isInitial?: boolean;
  requiresQualification?: boolean;
  askReviveDate?: boolean;
  staleDays?: number;
  staleTaskType?: "FOLLOW_UP" | "QUOTATION_FOLLOW_UP";
  probability?: number;
}

export interface PipelineSeed {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  autoProducts: string[];
  stages: StageSeed[];
}

export const PIPELINES: PipelineSeed[] = [
  {
    id: "pl_sales",
    name: "Sales — Kitchens & Wardrobes",
    description: "The client's 14 statuses from the Sales Pipeline sheet.",
    isDefault: true,
    autoProducts: [],
    stages: [
      { id: "stg_new", systemKey: "NEW", label: "1. New Lead / Inquiry", category: "OPEN", color: "#64748B", isInitial: true, probability: 5 },
      { id: "stg_contacted", systemKey: "CONTACTED", label: "2. Contacted", category: "OPEN", color: "#0EA5E9", staleDays: 3, probability: 10 },
      { id: "stg_qualified", systemKey: "QUALIFIED", label: "3. Lead Qualified", category: "OPEN", color: "#3B82F6", requiresQualification: true, staleDays: 3, probability: 20 },
      { id: "stg_discovery", systemKey: "DISCOVERY_MEETING", label: "4. Discovery / Requirement Meeting", category: "OPEN", color: "#6366F1", requiresQualification: true, staleDays: 4, probability: 35 },
      { id: "stg_quote_requested", systemKey: "QUOTATION_REQUESTED", label: "5. Quotation Requested", category: "OPEN", color: "#8B5CF6", requiresQualification: true, staleDays: 2, probability: 45 },
      { id: "stg_quote_sent", systemKey: "QUOTATION_SENT", label: "6. Quotation Sent", category: "OPEN", color: "#A855F7", requiresQualification: true, staleDays: 3, staleTaskType: "QUOTATION_FOLLOW_UP", probability: 55 },
      { id: "stg_negotiation", systemKey: "NEGOTIATION", label: "7. Negotiations", category: "OPEN", color: "#F59E0B", requiresQualification: true, staleDays: 2, probability: 70 },
      { id: "stg_token", systemKey: "TOKEN_RECEIVED", label: "8. Token Received", category: "OPEN", color: "#F97316", requiresQualification: true, staleDays: 5, probability: 90 },
      { id: "stg_won", systemKey: "CLOSED_WON", label: "9. Closed Won", category: "WON", color: "#10B981", probability: 100 },
      { id: "stg_lost_budget", systemKey: "LOST_BUDGET", label: "10. Closed Lost – Budget", category: "LOST", color: "#E11D48" },
      { id: "stg_lost_competitor", systemKey: "LOST_COMPETITOR", label: "10. Closed Lost – Competitor", category: "LOST", color: "#BE123C" },
      { id: "stg_lost_timeline", systemKey: "LOST_TIMELINE", label: "11. Closed Lost – Timeline", category: "LOST", color: "#94A3B8", askReviveDate: true },
      { id: "stg_lost_no_response", systemKey: "LOST_NO_RESPONSE", label: "12. Closed Lost – No response", category: "LOST", color: "#F43F5E" },
      { id: "stg_lost_on_hold", systemKey: "LOST_ON_HOLD", label: "13. Closed Lost – On Hold", category: "LOST", color: "#64748B", askReviveDate: true },
      { id: "stg_lost_others", systemKey: "LOST_OTHERS", label: "14. Closed Lost – Others", category: "LOST", color: "#9F1239" },
    ],
  },
  {
    id: "pl_turnkey",
    name: "Turnkey / Full Home",
    description: "Full-home interiors. Leads with the Full Home Interiors product start here.",
    isDefault: false,
    autoProducts: ["Full Home Interiors"],
    stages: [
      { systemKey: "NEW", label: "New enquiry", category: "OPEN", color: "#64748B", isInitial: true, probability: 5 },
      { systemKey: "SITE_VISIT", label: "Site visit & measurement", category: "OPEN", color: "#0EA5E9", staleDays: 4, probability: 20 },
      { systemKey: "DESIGN_PRESENTATION", label: "Design presentation", category: "OPEN", color: "#6366F1", requiresQualification: true, staleDays: 5, probability: 35 },
      { systemKey: "PROPOSAL_SENT", label: "Proposal sent", category: "OPEN", color: "#A855F7", requiresQualification: true, staleDays: 3, staleTaskType: "QUOTATION_FOLLOW_UP", probability: 55 },
      { systemKey: "NEGOTIATION", label: "Negotiation", category: "OPEN", color: "#F59E0B", requiresQualification: true, staleDays: 3, probability: 70 },
      { systemKey: "ADVANCE_RECEIVED", label: "Advance received", category: "OPEN", color: "#F97316", requiresQualification: true, staleDays: 7, probability: 90 },
      { systemKey: "CLOSED_WON", label: "Won", category: "WON", color: "#10B981", probability: 100 },
      { systemKey: "LOST_BUDGET", label: "Lost – Budget", category: "LOST", color: "#E11D48" },
      { systemKey: "LOST_COMPETITOR", label: "Lost – Competitor", category: "LOST", color: "#BE123C" },
      { systemKey: "LOST_NO_RESPONSE", label: "Lost – No response", category: "LOST", color: "#F43F5E" },
      { systemKey: "LOST_ON_HOLD", label: "Lost – On hold", category: "LOST", color: "#64748B", askReviveDate: true },
    ],
  },
];

export interface SourceSeed {
  id: string;
  name: string;
  color: string;
  isPaid?: boolean;
  isFallback?: boolean;
  integrationKeys: string[];
}

export const SOURCES: SourceSeed[] = [
  { id: "src_instagram_paid", name: "Instagram (Paid)", color: "#C026D3", isPaid: true, integrationKeys: ["meta:ig:paid", "sheet:Instagram Paid Media", "sheet:Instagram Paid Media Paid Media"] },
  { id: "src_instagram_organic", name: "Instagram (Organic)", color: "#DB2777", integrationKeys: ["meta:ig:organic", "sheet:Instagram Organic"] },
  { id: "src_facebook", name: "Facebook", color: "#2563EB", isPaid: true, integrationKeys: ["meta:fb:paid", "meta:fb:organic", "sheet:Facebook"] },
  { id: "src_google", name: "Google", color: "#EA580C", integrationKeys: ["sheet:Google"] },
  { id: "src_whatsapp", name: "WhatsApp", color: "#16A34A", integrationKeys: ["sheet:Whatsapp", "chat:whatsapp"] },
  { id: "src_linkedin", name: "LinkedIn", color: "#0369A1", integrationKeys: ["sheet:Linkedin"] },
  { id: "src_reference", name: "Reference / Architect", color: "#7C3AED", integrationKeys: ["sheet:Reference"] },
  { id: "src_repeat", name: "Repeat purchase", color: "#0D9488", integrationKeys: ["sheet:Repeat purchase"] },
  { id: "src_walk_in", name: "Walk-in", color: "#CA8A04", integrationKeys: ["sheet:Walkins"] },
  { id: "src_call", name: "Phone call", color: "#475569", integrationKeys: ["sheet:Call"] },
  { id: "src_website", name: "Website", color: "#0891B2", integrationKeys: ["web:form", "chat:website"] },
  { id: "src_other", name: "Other", color: "#94A3B8", isFallback: true, integrationKeys: [] },
];

export interface ProductSeed {
  id: string;
  name: string;
  metaAnswerKeys: string[];
}

export const PRODUCTS: ProductSeed[] = [
  { id: "prd_kitchen", name: "Kitchen", metaAnswerKeys: ["elementra_kitchens"] },
  { id: "prd_wardrobes", name: "Wardrobes", metaAnswerKeys: ["elementra_wardrobes"] },
  { id: "prd_furniture", name: "Furniture", metaAnswerKeys: ["elementra_furniture"] },
  { id: "prd_appliances", name: "Appliances", metaAnswerKeys: ["elementra_appliances"] },
  { id: "prd_beds", name: "Beds", metaAnswerKeys: ["elementra_beds"] },
  { id: "prd_others", name: "Others", metaAnswerKeys: [] },
  { id: "prd_full_home", name: "Full Home Interiors", metaAnswerKeys: ["elementra_full_home"] },
];

export interface RoleSeed {
  id: string;
  name: string;
  description: string;
  scope: DataScope;
  permissions: Permission[];
  isLocked?: boolean;
}

export const ROLES: RoleSeed[] = [
  { id: "role_super_admin", name: "Super Admin", description: "Business owner. Sees and can change everything.", scope: "ALL", permissions: ALL_PERMISSIONS, isLocked: true },
  {
    id: "role_branch_manager",
    name: "Branch Manager",
    description: "Runs one or more Experience Centres and their executives.",
    scope: "BRANCH",
    permissions: ["leads.create", "leads.edit", "leads.reassign", "leads.export", "leads.bulk", "leads.merge", "pipeline.move", "pipeline.reopen", "pipeline.overrideQualification", "queues.outOfArea", "queues.duplicates", "reports.view", "team.performance", "users.view", "users.manage"],
  },
  { id: "role_sales_executive", name: "Sales Executive", description: "Works their own leads.", scope: "OWN", permissions: ["leads.create", "leads.edit", "leads.export", "pipeline.move"] },
  { id: "role_online_desk", name: "Online Desk", description: "Pre-sales: works unrouted leads and hands them over.", scope: "OWN", permissions: ["leads.create", "leads.edit", "pipeline.move", "queues.needsLocation", "queues.duplicates", "imports.run"] },
  { id: "role_management_viewer", name: "Management Viewer", description: "Read-only view of numbers and people across all branches.", scope: "ALL", permissions: ["reports.view", "team.performance", "users.view", "audit.view"] },
];

export const SUPER_ADMIN_ROLE = "Super Admin";
