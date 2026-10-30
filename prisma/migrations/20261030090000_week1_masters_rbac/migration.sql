-- Week 1 masters + roles (06 §3). Hand-ordered so existing rows are MAPPED, not lost:
-- 1. new enums + tables, 2. master rows with fixed ids (the seed upserts the same rows),
-- 3. map Lead.stage/lostReason/source/products and User.role onto them, 4. drop the old enums.
-- Postgres keeps enum types and tables in one namespace, so the "Product" and "Role" enum types are
-- renamed before the same-named tables are created.

-- DropIndex
DROP INDEX "Contact_phoneE164_idx";
-- DropIndex
DROP INDEX "Lead_branchId_stage_idx";
-- DropIndex
DROP INDEX "Lead_ownerId_stage_idx";

ALTER TYPE "Product" RENAME TO "Product_legacy";
ALTER TYPE "Role" RENAME TO "Role_legacy";

-- CreateEnum
CREATE TYPE "StageCategory" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('OWN', 'BRANCH', 'ALL');

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "StageCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresQualification" BOOLEAN NOT NULL DEFAULT false,
    "askReviveDate" BOOLEAN NOT NULL DEFAULT false,
    "requiresNote" BOOLEAN NOT NULL DEFAULT false,
    "staleDays" INTEGER,
    "staleTaskType" TEXT,
    "probability" INTEGER,
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "integrationKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metaAnswerKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "DataScope" NOT NULL,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PipelineAutoProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PipelineAutoProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserExtraBranches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserExtraBranches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LeadProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LeadProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pipeline_name_key" ON "Pipeline"("name");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_sortOrder_idx" ON "PipelineStage"("pipelineId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_label_key" ON "PipelineStage"("pipelineId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_systemKey_key" ON "PipelineStage"("pipelineId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_key" ON "Source"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "_PipelineAutoProducts_B_index" ON "_PipelineAutoProducts"("B");

-- CreateIndex
CREATE INDEX "_UserExtraBranches_B_index" ON "_UserExtraBranches"("B");

-- CreateIndex
CREATE INDEX "_LeadProducts_B_index" ON "_LeadProducts"("B");

-- Master rows (generated from lib/domain/masters/defaults.ts)
INSERT INTO "Pipeline" ("id","name","description","isDefault","isActive","sortOrder","updatedAt") VALUES ('pl_sales', 'Sales — Kitchens & Wardrobes', 'The client''s 14 statuses from the Sales Pipeline sheet.', true, true, 0, CURRENT_TIMESTAMP);
INSERT INTO "PipelineStage" ("id","pipelineId","label","category","sortOrder","color","isInitial","requiresQualification","askReviveDate","staleDays","staleTaskType","probability","systemKey","updatedAt") VALUES
  ('stg_new', 'pl_sales', '1. New Lead / Inquiry', 'OPEN', 1, '#64748B', true, false, false, NULL, NULL, 5, 'NEW', CURRENT_TIMESTAMP),
  ('stg_contacted', 'pl_sales', '2. Contacted', 'OPEN', 2, '#0EA5E9', false, false, false, 3, 'FOLLOW_UP', 10, 'CONTACTED', CURRENT_TIMESTAMP),
  ('stg_qualified', 'pl_sales', '3. Lead Qualified', 'OPEN', 3, '#3B82F6', false, true, false, 3, 'FOLLOW_UP', 20, 'QUALIFIED', CURRENT_TIMESTAMP),
  ('stg_discovery', 'pl_sales', '4. Discovery / Requirement Meeting', 'OPEN', 4, '#6366F1', false, true, false, 4, 'FOLLOW_UP', 35, 'DISCOVERY_MEETING', CURRENT_TIMESTAMP),
  ('stg_quote_requested', 'pl_sales', '5. Quotation Requested', 'OPEN', 5, '#8B5CF6', false, true, false, 2, 'FOLLOW_UP', 45, 'QUOTATION_REQUESTED', CURRENT_TIMESTAMP),
  ('stg_quote_sent', 'pl_sales', '6. Quotation Sent', 'OPEN', 6, '#A855F7', false, true, false, 3, 'QUOTATION_FOLLOW_UP', 55, 'QUOTATION_SENT', CURRENT_TIMESTAMP),
  ('stg_negotiation', 'pl_sales', '7. Negotiations', 'OPEN', 7, '#F59E0B', false, true, false, 2, 'FOLLOW_UP', 70, 'NEGOTIATION', CURRENT_TIMESTAMP),
  ('stg_token', 'pl_sales', '8. Token Received', 'OPEN', 8, '#F97316', false, true, false, 5, 'FOLLOW_UP', 90, 'TOKEN_RECEIVED', CURRENT_TIMESTAMP),
  ('stg_won', 'pl_sales', '9. Closed Won', 'WON', 9, '#10B981', false, false, false, NULL, NULL, 100, 'CLOSED_WON', CURRENT_TIMESTAMP),
  ('stg_lost_budget', 'pl_sales', '10. Closed Lost – Budget', 'LOST', 10, '#E11D48', false, false, false, NULL, NULL, NULL, 'LOST_BUDGET', CURRENT_TIMESTAMP),
  ('stg_lost_competitor', 'pl_sales', '10. Closed Lost – Competitor', 'LOST', 11, '#BE123C', false, false, false, NULL, NULL, NULL, 'LOST_COMPETITOR', CURRENT_TIMESTAMP),
  ('stg_lost_timeline', 'pl_sales', '11. Closed Lost – Timeline', 'LOST', 12, '#94A3B8', false, false, true, NULL, NULL, NULL, 'LOST_TIMELINE', CURRENT_TIMESTAMP),
  ('stg_lost_no_response', 'pl_sales', '12. Closed Lost – No response', 'LOST', 13, '#F43F5E', false, false, false, NULL, NULL, NULL, 'LOST_NO_RESPONSE', CURRENT_TIMESTAMP),
  ('stg_lost_on_hold', 'pl_sales', '13. Closed Lost – On Hold', 'LOST', 14, '#64748B', false, false, true, NULL, NULL, NULL, 'LOST_ON_HOLD', CURRENT_TIMESTAMP),
  ('stg_lost_others', 'pl_sales', '14. Closed Lost – Others', 'LOST', 15, '#9F1239', false, false, false, NULL, NULL, NULL, 'LOST_OTHERS', CURRENT_TIMESTAMP);
INSERT INTO "Source" ("id","name","color","isPaid","isFallback","isActive","sortOrder","integrationKeys","updatedAt") VALUES
  ('src_instagram_paid', 'Instagram (Paid)', '#C026D3', true, false, true, 1, ARRAY['meta:ig:paid', 'sheet:Instagram Paid Media', 'sheet:Instagram Paid Media Paid Media']::TEXT[], CURRENT_TIMESTAMP),
  ('src_instagram_organic', 'Instagram (Organic)', '#DB2777', false, false, true, 2, ARRAY['meta:ig:organic', 'sheet:Instagram Organic']::TEXT[], CURRENT_TIMESTAMP),
  ('src_facebook', 'Facebook', '#2563EB', true, false, true, 3, ARRAY['meta:fb:paid', 'meta:fb:organic', 'sheet:Facebook']::TEXT[], CURRENT_TIMESTAMP),
  ('src_google', 'Google', '#EA580C', false, false, true, 4, ARRAY['sheet:Google']::TEXT[], CURRENT_TIMESTAMP),
  ('src_whatsapp', 'WhatsApp', '#16A34A', false, false, true, 5, ARRAY['sheet:Whatsapp', 'chat:whatsapp']::TEXT[], CURRENT_TIMESTAMP),
  ('src_linkedin', 'LinkedIn', '#0369A1', false, false, true, 6, ARRAY['sheet:Linkedin']::TEXT[], CURRENT_TIMESTAMP),
  ('src_reference', 'Reference / Architect', '#7C3AED', false, false, true, 7, ARRAY['sheet:Reference']::TEXT[], CURRENT_TIMESTAMP),
  ('src_repeat', 'Repeat purchase', '#0D9488', false, false, true, 8, ARRAY['sheet:Repeat purchase']::TEXT[], CURRENT_TIMESTAMP),
  ('src_walk_in', 'Walk-in', '#CA8A04', false, false, true, 9, ARRAY['sheet:Walkins']::TEXT[], CURRENT_TIMESTAMP),
  ('src_call', 'Phone call', '#475569', false, false, true, 10, ARRAY['sheet:Call']::TEXT[], CURRENT_TIMESTAMP),
  ('src_website', 'Website', '#0891B2', false, false, true, 11, ARRAY['web:form', 'chat:website']::TEXT[], CURRENT_TIMESTAMP),
  ('src_other', 'Other', '#94A3B8', false, true, true, 12, ARRAY[]::TEXT[], CURRENT_TIMESTAMP);
INSERT INTO "Product" ("id","name","isActive","sortOrder","metaAnswerKeys","updatedAt") VALUES
  ('prd_kitchen', 'Kitchen', true, 1, ARRAY['elementra_kitchens']::TEXT[], CURRENT_TIMESTAMP),
  ('prd_wardrobes', 'Wardrobes', true, 2, ARRAY['elementra_wardrobes']::TEXT[], CURRENT_TIMESTAMP),
  ('prd_furniture', 'Furniture', true, 3, ARRAY['elementra_furniture']::TEXT[], CURRENT_TIMESTAMP),
  ('prd_appliances', 'Appliances', true, 4, ARRAY['elementra_appliances']::TEXT[], CURRENT_TIMESTAMP),
  ('prd_beds', 'Beds', true, 5, ARRAY['elementra_beds']::TEXT[], CURRENT_TIMESTAMP),
  ('prd_others', 'Others', true, 6, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  ('prd_full_home', 'Full Home Interiors', true, 7, ARRAY['elementra_full_home']::TEXT[], CURRENT_TIMESTAMP);
INSERT INTO "Role" ("id","name","description","scope","permissions","isSystem","isLocked","updatedAt") VALUES
  ('role_super_admin', 'Super Admin', 'Business owner. Sees and can change everything.', 'ALL', ARRAY['leads.create', 'leads.edit', 'leads.reassign', 'leads.delete', 'leads.export', 'leads.bulk', 'leads.merge', 'pipeline.move', 'pipeline.reopen', 'pipeline.overrideQualification', 'queues.needsLocation', 'queues.outOfArea', 'queues.duplicates', 'reports.view', 'team.performance', 'users.view', 'users.manage', 'roles.manage', 'pipelines.manage', 'branches.manage', 'masters.manage', 'settings.manage', 'automations.manage', 'templates.manage', 'chatbot.manage', 'integrations.manage', 'imports.run', 'audit.view', 'demo.use']::TEXT[], true, true, CURRENT_TIMESTAMP),
  ('role_branch_manager', 'Branch Manager', 'Runs one or more Experience Centres and their executives.', 'BRANCH', ARRAY['leads.create', 'leads.edit', 'leads.reassign', 'leads.export', 'leads.bulk', 'leads.merge', 'pipeline.move', 'pipeline.reopen', 'pipeline.overrideQualification', 'queues.outOfArea', 'queues.duplicates', 'reports.view', 'team.performance', 'users.view', 'users.manage']::TEXT[], true, false, CURRENT_TIMESTAMP),
  ('role_sales_executive', 'Sales Executive', 'Works their own leads.', 'OWN', ARRAY['leads.create', 'leads.edit', 'leads.export', 'pipeline.move']::TEXT[], true, false, CURRENT_TIMESTAMP),
  ('role_online_desk', 'Online Desk', 'Pre-sales: works unrouted leads and hands them over.', 'OWN', ARRAY['leads.create', 'leads.edit', 'pipeline.move', 'queues.needsLocation', 'queues.duplicates', 'imports.run']::TEXT[], true, false, CURRENT_TIMESTAMP),
  ('role_management_viewer', 'Management Viewer', 'Read-only view of numbers and people across all branches.', 'ALL', ARRAY['reports.view', 'team.performance', 'users.view', 'audit.view']::TEXT[], true, false, CURRENT_TIMESTAMP);

-- Lead: stage + lost reason -> PipelineStage, source -> Source, products -> _LeadProducts
ALTER TABLE "Lead" ADD COLUMN "pipelineId" TEXT, ADD COLUMN "stageId" TEXT, ADD COLUMN "sourceId" TEXT, ADD COLUMN "openPhoneKey" VARCHAR(16);

UPDATE "Lead" SET "pipelineId" = 'pl_sales', "stageId" = CASE
  WHEN "stage" = 'CLOSED_LOST' THEN CASE "lostReason"
    WHEN 'BUDGET' THEN 'stg_lost_budget'
    WHEN 'COMPETITOR' THEN 'stg_lost_competitor'
    WHEN 'TIMELINE' THEN 'stg_lost_timeline'
    WHEN 'NO_RESPONSE' THEN 'stg_lost_no_response'
    WHEN 'ON_HOLD' THEN 'stg_lost_on_hold'
    ELSE 'stg_lost_others' END
  WHEN "stage" = 'NEW' THEN 'stg_new'
  WHEN "stage" = 'CONTACTED' THEN 'stg_contacted'
  WHEN "stage" = 'QUALIFIED' THEN 'stg_qualified'
  WHEN "stage" = 'DISCOVERY_MEETING' THEN 'stg_discovery'
  WHEN "stage" = 'QUOTATION_REQUESTED' THEN 'stg_quote_requested'
  WHEN "stage" = 'QUOTATION_SENT' THEN 'stg_quote_sent'
  WHEN "stage" = 'NEGOTIATION' THEN 'stg_negotiation'
  WHEN "stage" = 'TOKEN_RECEIVED' THEN 'stg_token'
  WHEN "stage" = 'CLOSED_WON' THEN 'stg_won'
END;

UPDATE "Lead" SET "sourceId" = CASE "source"
  WHEN 'INSTAGRAM_PAID' THEN 'src_instagram_paid'
  WHEN 'INSTAGRAM_ORGANIC' THEN 'src_instagram_organic'
  WHEN 'FACEBOOK' THEN 'src_facebook'
  WHEN 'GOOGLE' THEN 'src_google'
  WHEN 'WHATSAPP' THEN 'src_whatsapp'
  WHEN 'LINKEDIN' THEN 'src_linkedin'
  WHEN 'REFERENCE' THEN 'src_reference'
  WHEN 'REPEAT_PURCHASE' THEN 'src_repeat'
  WHEN 'WALK_IN' THEN 'src_walk_in'
  WHEN 'CALL' THEN 'src_call'
  WHEN 'WEBSITE' THEN 'src_website'
  ELSE 'src_other' END;

INSERT INTO "_LeadProducts" ("A", "B")
SELECT DISTINCT l."id", CASE p::text
  WHEN 'KITCHEN' THEN 'prd_kitchen'
  WHEN 'WARDROBES' THEN 'prd_wardrobes'
  WHEN 'FURNITURE' THEN 'prd_furniture'
  WHEN 'APPLIANCES' THEN 'prd_appliances'
  WHEN 'BEDS' THEN 'prd_beds'
  ELSE 'prd_others' END
FROM "Lead" l, unnest(l."products") AS p;

-- One open lead per phone: the oldest open lead per number keeps the key
UPDATE "Lead" l SET "openPhoneKey" = l."phoneE164"
FROM (
  SELECT DISTINCT ON ("phoneE164") "id" FROM "Lead"
  WHERE "phoneE164" IS NOT NULL AND "stage" NOT IN ('CLOSED_WON', 'CLOSED_LOST')
  ORDER BY "phoneE164", "createdAt"
) first_open
WHERE l."id" = first_open."id";

ALTER TABLE "Lead" ALTER COLUMN "pipelineId" SET NOT NULL, ALTER COLUMN "stageId" SET NOT NULL, ALTER COLUMN "sourceId" SET NOT NULL;
ALTER TABLE "Lead" DROP COLUMN "stage", DROP COLUMN "lostReason", DROP COLUMN "source", DROP COLUMN "products";

-- User: role enum -> Role table (Owner and Admin both become Super Admin)
ALTER TABLE "User" ADD COLUMN "roleId" TEXT,
ADD COLUMN "deactivatedAt" TIMESTAMP(3),
ADD COLUMN "designation" TEXT,
ADD COLUMN "employeeCode" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reportsToId" TEXT;

UPDATE "User" SET "roleId" = CASE "role"::text
  WHEN 'OWNER' THEN 'role_super_admin'
  WHEN 'ADMIN' THEN 'role_super_admin'
  WHEN 'SALES_MANAGER' THEN 'role_branch_manager'
  WHEN 'PRESALES' THEN 'role_online_desk'
  ELSE 'role_sales_executive' END;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "role";

DROP TYPE "LeadSource";
DROP TYPE "LeadStage";
DROP TYPE "LostReason";
DROP TYPE "Product_legacy";
DROP TYPE "Role_legacy";

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phoneE164_key" ON "Contact"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_openPhoneKey_key" ON "Lead"("openPhoneKey");

-- CreateIndex
CREATE INDEX "Lead_ownerId_stageId_idx" ON "Lead"("ownerId", "stageId");

-- CreateIndex
CREATE INDEX "Lead_branchId_stageId_idx" ON "Lead"("branchId", "stageId");

-- CreateIndex
CREATE INDEX "Lead_pipelineId_stageId_idx" ON "Lead"("pipelineId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PipelineAutoProducts" ADD CONSTRAINT "_PipelineAutoProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PipelineAutoProducts" ADD CONSTRAINT "_PipelineAutoProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserExtraBranches" ADD CONSTRAINT "_UserExtraBranches_A_fkey" FOREIGN KEY ("A") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserExtraBranches" ADD CONSTRAINT "_UserExtraBranches_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadProducts" ADD CONSTRAINT "_LeadProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadProducts" ADD CONSTRAINT "_LeadProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
