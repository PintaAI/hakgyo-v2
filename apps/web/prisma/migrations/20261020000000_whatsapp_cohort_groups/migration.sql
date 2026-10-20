-- WhatsApp groups for cohorts through Evolution API (docs/whatsapp.md): one linked
-- number per organization, the group Hakgyo created per cohort, and a paced outbox.
-- CreateEnum
CREATE TYPE "WhatsappConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "WhatsappOutboxKind" AS ENUM ('CREATE_GROUP', 'GROUP_MESSAGE');

-- CreateEnum
CREATE TYPE "WhatsappOutboxStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN     "whatsappGroupCreatedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappGroupJid" TEXT;

-- CreateTable
CREATE TABLE "WhatsappConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectedByMembershipId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "encryptedInstanceToken" TEXT NOT NULL,
    "phoneJid" TEXT,
    "initialParticipantPhone" TEXT,
    "status" "WhatsappConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "autoCreateGroups" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappOutbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "kind" "WhatsappOutboxKind" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WhatsappOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sendAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConnection_organizationId_key" ON "WhatsappConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConnection_instanceName_key" ON "WhatsappConnection"("instanceName");

-- CreateIndex
CREATE INDEX "WhatsappConnection_connectedByMembershipId_idx" ON "WhatsappConnection"("connectedByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappOutbox_dedupeKey_key" ON "WhatsappOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "WhatsappOutbox_status_sendAfter_idx" ON "WhatsappOutbox"("status", "sendAfter");

-- CreateIndex
CREATE INDEX "WhatsappOutbox_organizationId_kind_status_sentAt_idx" ON "WhatsappOutbox"("organizationId", "kind", "status", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsappOutbox_cohortId_idx" ON "WhatsappOutbox"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_whatsappGroupJid_key" ON "Cohort"("whatsappGroupJid");

-- AddForeignKey
ALTER TABLE "WhatsappConnection" ADD CONSTRAINT "WhatsappConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConnection" ADD CONSTRAINT "WhatsappConnection_connectedByMembershipId_organizationId_fkey" FOREIGN KEY ("connectedByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappOutbox" ADD CONSTRAINT "WhatsappOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappOutbox" ADD CONSTRAINT "WhatsappOutbox_cohortId_organizationId_fkey" FOREIGN KEY ("cohortId", "organizationId") REFERENCES "Cohort"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

