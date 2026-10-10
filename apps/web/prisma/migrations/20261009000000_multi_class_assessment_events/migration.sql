-- Assessment events target one or more classes (cohorts) of their course instead of
-- a COHORT/COURSE scope, and can be scheduled to open automatically.

-- AlterEnum
ALTER TYPE "AssessmentEventStatus" ADD VALUE 'SCHEDULED' BEFORE 'OPEN';

-- AlterEnum
ALTER TYPE "AssessmentEventAuditAction" ADD VALUE 'SCHEDULED' BEFORE 'OPENED';
ALTER TYPE "AssessmentEventAuditAction" ADD VALUE 'COHORTS_ADDED' BEFORE 'ATTEMPT_INVALIDATED';

-- CreateTable
CREATE TABLE "AssessmentEventCohort" (
    "eventId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentEventCohort_pkey" PRIMARY KEY ("eventId","cohortId")
);

-- AlterTable
ALTER TABLE "AssessmentEvent" ADD COLUMN "allCohorts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attemptsFinalizedAt" TIMESTAMP(3),
ADD COLUMN "opensAt" TIMESTAMP(3),
ADD COLUMN "notifyOnOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "openNotificationSentAt" TIMESTAMP(3);

-- Events opened before this migration already sent (or skipped) their "opened" push.
UPDATE "AssessmentEvent"
SET "openNotificationSentAt" = COALESCE("openedAt", CURRENT_TIMESTAMP)
WHERE "status" <> 'DRAFT';

-- AlterTable
ALTER TABLE "AssessmentEventParticipant" ADD COLUMN "cohortId" TEXT;

-- Backfill: cohort-scoped events target their cohort.
INSERT INTO "AssessmentEventCohort" ("eventId", "cohortId", "createdAt")
SELECT "id", "cohortId", "createdAt"
FROM "AssessmentEvent"
WHERE "scope" = 'COHORT' AND "cohortId" IS NOT NULL;

UPDATE "AssessmentEventParticipant" AS participant
SET "cohortId" = event."cohortId"
FROM "AssessmentEvent" AS event
WHERE event."id" = participant."eventId"
  AND event."scope" = 'COHORT'
  AND event."cohortId" IS NOT NULL;

-- Backfill: course-scoped events targeted every class of the course. Each participant is
-- attributed to their earliest class of the course, and those classes become the targets.
UPDATE "AssessmentEvent" SET "allCohorts" = true WHERE "scope" = 'COURSE';

UPDATE "AssessmentEventParticipant" AS participant
SET "cohortId" = (
    SELECT enrollment."cohortId"
    FROM "CohortEnrollment" AS enrollment
    JOIN "Cohort" AS cohort ON cohort."id" = enrollment."cohortId"
    WHERE cohort."courseId" = event."courseId"
      AND enrollment."userId" = participant."userId"
    ORDER BY enrollment."enrolledAt" ASC, enrollment."id" ASC
    LIMIT 1
)
FROM "AssessmentEvent" AS event
WHERE event."id" = participant."eventId"
  AND event."scope" = 'COURSE';

INSERT INTO "AssessmentEventCohort" ("eventId", "cohortId", "createdAt")
SELECT DISTINCT participant."eventId", participant."cohortId", event."createdAt"
FROM "AssessmentEventParticipant" AS participant
JOIN "AssessmentEvent" AS event ON event."id" = participant."eventId"
WHERE event."scope" = 'COURSE' AND participant."cohortId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Open course-scoped events stay open to every class of the course that grants access, including
-- classes without participants yet, so their learners can still join.
INSERT INTO "AssessmentEventCohort" ("eventId", "cohortId", "createdAt")
SELECT event."id", cohort."id", event."createdAt"
FROM "AssessmentEvent" AS event
JOIN "Cohort" AS cohort ON cohort."courseId" = event."courseId"
WHERE event."scope" = 'COURSE'
  AND event."status" = 'OPEN'
  AND cohort."status" IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')
ON CONFLICT DO NOTHING;

-- Event attempts carry the learner's class, like chapter attempts (never the self-paced cohort).
UPDATE "AssessmentAttempt" AS attempt
SET "cohortId" = participant."cohortId"
FROM "AssessmentEventParticipant" AS participant
JOIN "Cohort" AS cohort ON cohort."id" = participant."cohortId"
WHERE attempt."assessmentEventId" = participant."eventId"
  AND attempt."userId" = participant."userId"
  AND attempt."cohortId" IS NULL
  AND cohort."defaultForCourseId" IS NULL;

-- DropForeignKey
ALTER TABLE "AssessmentEvent" DROP CONSTRAINT "AssessmentEvent_cohortId_fkey";

-- DropIndex
DROP INDEX "AssessmentEvent_courseId_cohortId_createdAt_idx";

-- DropIndex
DROP INDEX "AssessmentEvent_cohortId_status_createdAt_idx";

-- AlterTable
ALTER TABLE "AssessmentEvent" DROP COLUMN "cohortId",
DROP COLUMN "scope";

-- DropEnum
DROP TYPE "AssessmentEventScope";

-- CreateIndex
CREATE INDEX "AssessmentEventCohort_cohortId_eventId_idx" ON "AssessmentEventCohort"("cohortId", "eventId");

-- CreateIndex
CREATE INDEX "AssessmentEvent_courseId_createdAt_idx" ON "AssessmentEvent"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentEvent_status_opensAt_idx" ON "AssessmentEvent"("status", "opensAt");

-- CreateIndex
CREATE INDEX "AssessmentEvent_status_closesAt_idx" ON "AssessmentEvent"("status", "closesAt");

-- CreateIndex
CREATE INDEX "AssessmentEvent_status_attemptsFinalizedAt_idx" ON "AssessmentEvent"("status", "attemptsFinalizedAt");

-- CreateIndex
CREATE INDEX "AssessmentEventParticipant_eventId_cohortId_idx" ON "AssessmentEventParticipant"("eventId", "cohortId");

-- AddForeignKey
ALTER TABLE "AssessmentEventCohort" ADD CONSTRAINT "AssessmentEventCohort_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AssessmentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEventCohort" ADD CONSTRAINT "AssessmentEventCohort_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEventParticipant" ADD CONSTRAINT "AssessmentEventParticipant_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
