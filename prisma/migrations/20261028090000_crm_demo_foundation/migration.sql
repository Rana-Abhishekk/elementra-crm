-- CreateEnum
CREATE TYPE "BranchKind" AS ENUM ('EXPERIENCE_CENTRE', 'ONLINE_DESK');

-- CreateEnum
CREATE TYPE "AssignmentStrategy" AS ENUM ('ROUND_ROBIN', 'LEAST_OPEN_LEADS');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DISCOVERY_MEETING', 'QUOTATION_REQUESTED', 'QUOTATION_SENT', 'NEGOTIATION', 'TOKEN_RECEIVED', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('BUDGET', 'COMPETITOR', 'TIMELINE', 'NO_RESPONSE', 'ON_HOLD', 'OTHERS');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INSTAGRAM_PAID', 'INSTAGRAM_ORGANIC', 'FACEBOOK', 'GOOGLE', 'WHATSAPP', 'LINKEDIN', 'REFERENCE', 'REPEAT_PURCHASE', 'WALK_IN', 'CALL', 'WEBSITE');

-- CreateEnum
CREATE TYPE "IntakeChannel" AS ENUM ('META_LEAD_AD', 'WEBSITE_FORM', 'WHATSAPP', 'GOOGLE_SHEET', 'CSV_IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "Product" AS ENUM ('KITCHEN', 'WARDROBES', 'FURNITURE', 'APPLIANCES', 'BEDS', 'OTHERS');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('RESOLVED', 'NEEDS_LOCATION', 'OUT_OF_AREA');

-- CreateEnum
CREATE TYPE "GeoMethod" AS ENUM ('PINCODE', 'ALIAS', 'FUZZY', 'GOOGLE', 'MANUAL', 'NONE');

-- CreateEnum
CREATE TYPE "RoutingRule" AS ENUM ('PINCODE_RULE', 'NEAREST_IN_RADIUS', 'OUT_OF_AREA', 'NEEDS_LOCATION', 'VIA_PRESALES', 'RETURNING_SAME_OWNER', 'MANUAL');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'WRONG_NUMBER', 'CALLBACK_REQUESTED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FIRST_CALL', 'FOLLOW_UP', 'CAPTURE_LOCATION', 'APPOINTMENT_PREP', 'VISIT_OUTCOME', 'QUOTATION_FOLLOW_UP', 'REVIVE', 'ESCALATION', 'OUT_OF_AREA_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'VISITED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('UTILITY', 'MARKETING');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('CUSTOMER', 'ARCHITECT', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyKind" AS ENUM ('ARCHITECT_FIRM', 'BUILDER', 'VENDOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('MEASUREMENT_REVERIFY', 'CIVIL_WORK', 'PRODUCTION_MEASUREMENT', 'ORDER_SENT_TO_FACTORY', 'MATERIAL_DELIVERED', 'INSTALLATION', 'CLEANING', 'HANDOVER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'WHATSAPP';
ALTER TYPE "ActivityType" ADD VALUE 'SHOWROOM_VISIT';
ALTER TYPE "ActivityType" ADD VALUE 'STAGE_CHANGE';
ALTER TYPE "ActivityType" ADD VALUE 'ASSIGNMENT';
ALTER TYPE "ActivityType" ADD VALUE 'HANDOVER';
ALTER TYPE "ActivityType" ADD VALUE 'FOLLOW_UP_SET';
ALTER TYPE "ActivityType" ADD VALUE 'MESSAGE_SENT';
ALTER TYPE "ActivityType" ADD VALUE 'APPOINTMENT';
ALTER TYPE "ActivityType" ADD VALUE 'ROUTING';
ALTER TYPE "ActivityType" ADD VALUE 'SYSTEM';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'ADMIN', 'SALES_MANAGER', 'PRESALES', 'SALES_REP');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
-- Hand-edited: existing MEMBER users become SALES_REP (ADMIN stays ADMIN)
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE WHEN "role"::text = 'MEMBER' THEN 'SALES_REP' ELSE "role"::text END
)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'SALES_REP';
COMMIT;

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "callOutcome" "CallOutcome",
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "meta" JSONB;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "kind" "CompanyKind" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "kind" "ContactKind" NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN     "phoneE164" VARCHAR(16);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastAssignedAt" TIMESTAMP(3),
ADD COLUMN     "onLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onLeaveUntil" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "receivesLeads" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "role" SET DEFAULT 'SALES_REP';

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BranchKind" NOT NULL DEFAULT 'EXPERIENCE_CENTRE',
    "city" TEXT NOT NULL,
    "area" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "assignmentStrategy" "AssignmentStrategy" NOT NULL DEFAULT 'ROUND_ROBIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchPincode" (
    "id" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "label" TEXT,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "BranchPincode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "aliases" TEXT[],

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "contactId" TEXT,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phoneE164" VARCHAR(16),
    "altPhoneE164" VARCHAR(16),
    "email" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "siteAddressRaw" TEXT,
    "pincode" TEXT,
    "localityId" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geoMethod" "GeoMethod" NOT NULL DEFAULT 'NONE',
    "geoConfidence" DOUBLE PRECISION,
    "locationStatus" "LocationStatus" NOT NULL DEFAULT 'NEEDS_LOCATION',
    "branchId" TEXT,
    "ownerId" TEXT,
    "handedOverById" TEXT,
    "handedOverAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lostReason" "LostReason",
    "lostNote" TEXT,
    "reviveAt" TIMESTAMP(3),
    "products" "Product"[],
    "priority" "Priority" NOT NULL DEFAULT 'WARM',
    "possessionDate" TIMESTAMP(3),
    "budgetNote" TEXT,
    "estimatedValueInr" INTEGER,
    "orderValueInr" INTEGER,
    "architectId" TEXT,
    "architectCommissionPct" DOUBLE PRECISION,
    "source" "LeadSource" NOT NULL,
    "intakeChannel" "IntakeChannel" NOT NULL,
    "campaignName" TEXT,
    "adsetName" TEXT,
    "adName" TEXT,
    "formName" TEXT,
    "platform" TEXT,
    "externalId" TEXT,
    "rawPayload" JSONB,
    "nextFollowUpAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstContactedAt" TIMESTAMP(3),
    "duplicateOfId" TEXT,
    "isReturning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingDecision" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "inputText" TEXT,
    "geoMethod" "GeoMethod" NOT NULL,
    "geoConfidence" DOUBLE PRECISION,
    "matchedLabel" TEXT,
    "rule" "RoutingRule" NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "candidates" JSONB NOT NULL,
    "chosenBranchId" TEXT,
    "chosenUserId" TEXT,
    "strategy" "AssignmentStrategy",
    "skipped" JSONB,
    "explanation" TEXT[],
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "assigneeId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "ruleCode" TEXT,
    "dedupeKey" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "hostId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "leadId" TEXT,
    "href" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "direction" TEXT NOT NULL DEFAULT 'OUT',
    "templateCode" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "toPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'SIMULATOR',
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentById" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "designerId" TEXT,
    "supervisorId" TEXT,
    "stage" "ProjectStage" NOT NULL DEFAULT 'MEASUREMENT_REVERIFY',
    "stageHistory" JSONB NOT NULL DEFAULT '[]',
    "expectedHandoverAt" TIMESTAMP(3),
    "handoverAt" TIMESTAMP(3),
    "warrantyEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "duplicates" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "errors" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BranchPincode_pincode_key" ON "BranchPincode"("pincode");

-- CreateIndex
CREATE INDEX "Locality_pincode_idx" ON "Locality"("pincode");

-- CreateIndex
CREATE UNIQUE INDEX "Locality_name_city_key" ON "Locality"("name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_refCode_key" ON "Lead"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalId_key" ON "Lead"("externalId");

-- CreateIndex
CREATE INDEX "Lead_ownerId_stage_idx" ON "Lead"("ownerId", "stage");

-- CreateIndex
CREATE INDEX "Lead_branchId_stage_idx" ON "Lead"("branchId", "stage");

-- CreateIndex
CREATE INDEX "Lead_locationStatus_idx" ON "Lead"("locationStatus");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_phoneE164_idx" ON "Lead"("phoneE164");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "RoutingDecision_leadId_createdAt_idx" ON "RoutingDecision"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_dedupeKey_key" ON "Task"("dedupeKey");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_dueAt_idx" ON "Task"("assigneeId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_leadId_status_idx" ON "Task"("leadId", "status");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_code_language_key" ON "MessageTemplate"("code", "language");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundMessage_dedupeKey_key" ON "OutboundMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "OutboundMessage_leadId_createdAt_idx" ON "OutboundMessage"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_createdAt_idx" ON "OutboundMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_leadId_key" ON "Project"("leadId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_leadId_createdAt_idx" ON "Activity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_phoneE164_idx" ON "Contact"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_leadId_key" ON "Deal"("leadId");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchPincode" ADD CONSTRAINT "BranchPincode_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_handedOverById_fkey" FOREIGN KEY ("handedOverById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_architectId_fkey" FOREIGN KEY ("architectId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingDecision" ADD CONSTRAINT "RoutingDecision_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

