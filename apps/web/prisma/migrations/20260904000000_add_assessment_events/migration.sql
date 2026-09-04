CREATE TYPE "AssessmentEventType" AS ENUM ('QUICK_ASSESSMENT', 'TRYOUT');
CREATE TYPE "AssessmentEventScope" AS ENUM ('COHORT', 'COURSE');
CREATE TYPE "AssessmentEventStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE "AssessmentEventAuditAction" AS ENUM ('OPENED', 'CLOSED', 'CANCELLED', 'ATTEMPT_INVALIDATED', 'RESULT_ADJUSTED');

CREATE TABLE "AssessmentEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "cohortId" TEXT,
    "courseItemId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "type" "AssessmentEventType" NOT NULL,
    "scope" "AssessmentEventScope" NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "AssessmentEventStatus" NOT NULL DEFAULT 'DRAFT',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentEventParticipant" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "invalidationReason" TEXT,
    "invalidatedByMembershipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentEventParticipant_pkey" PRIMARY KEY ("eventId", "userId")
);

CREATE TABLE "AssessmentEventAudit" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorMembershipId" TEXT NOT NULL,
    "attemptId" TEXT,
    "action" "AssessmentEventAuditAction" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentEventAudit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssessmentAttempt" ADD COLUMN "assessmentEventId" TEXT;

CREATE UNIQUE INDEX "AssessmentEvent_id_organizationId_key" ON "AssessmentEvent"("id", "organizationId");
CREATE INDEX "AssessmentEvent_courseId_status_createdAt_idx" ON "AssessmentEvent"("courseId", "status", "createdAt");
CREATE INDEX "AssessmentEvent_cohortId_status_createdAt_idx" ON "AssessmentEvent"("cohortId", "status", "createdAt");
CREATE INDEX "AssessmentEvent_courseItemId_idx" ON "AssessmentEvent"("courseItemId");
CREATE INDEX "AssessmentEvent_createdByMembershipId_idx" ON "AssessmentEvent"("createdByMembershipId");
CREATE INDEX "AssessmentEventParticipant_userId_createdAt_idx" ON "AssessmentEventParticipant"("userId", "createdAt");
CREATE INDEX "AssessmentEventParticipant_invalidatedByMembershipId_idx" ON "AssessmentEventParticipant"("invalidatedByMembershipId");
CREATE INDEX "AssessmentEventAudit_eventId_createdAt_idx" ON "AssessmentEventAudit"("eventId", "createdAt");
CREATE INDEX "AssessmentEventAudit_actorMembershipId_idx" ON "AssessmentEventAudit"("actorMembershipId");
CREATE INDEX "AssessmentEventAudit_attemptId_idx" ON "AssessmentEventAudit"("attemptId");
CREATE UNIQUE INDEX "AssessmentAttempt_assessmentEventId_userId_key" ON "AssessmentAttempt"("assessmentEventId", "userId");
CREATE INDEX "AssessmentAttempt_assessmentEventId_status_idx" ON "AssessmentAttempt"("assessmentEventId", "status");

ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_courseId_organizationId_fkey" FOREIGN KEY ("courseId", "organizationId") REFERENCES "Course"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_courseItemId_organizationId_fkey" FOREIGN KEY ("courseItemId", "organizationId") REFERENCES "CourseItem"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentEventParticipant" ADD CONSTRAINT "AssessmentEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AssessmentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentEventParticipant" ADD CONSTRAINT "AssessmentEventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentEventParticipant" ADD CONSTRAINT "AssessmentEventParticipant_invalidatedByMembershipId_fkey" FOREIGN KEY ("invalidatedByMembershipId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentEventAudit" ADD CONSTRAINT "AssessmentEventAudit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AssessmentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentEventAudit" ADD CONSTRAINT "AssessmentEventAudit_actorMembershipId_fkey" FOREIGN KEY ("actorMembershipId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentEventAudit" ADD CONSTRAINT "AssessmentEventAudit_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentEventId_fkey" FOREIGN KEY ("assessmentEventId") REFERENCES "AssessmentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
