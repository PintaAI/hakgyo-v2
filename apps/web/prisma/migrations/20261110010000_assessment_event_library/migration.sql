-- Assessment events can run an assessment from the organization's library, not only one placed
-- in the course: the event names its assessment directly, and the course placement (on the event
-- and on its attempts) becomes optional.

-- AlterTable
ALTER TABLE "AssessmentEvent" ADD COLUMN "assessmentId" TEXT;

-- Every existing event ran the assessment of its course item.
UPDATE "AssessmentEvent" AS "event"
SET "assessmentId" = "item"."assessmentId"
FROM "CourseItem" AS "item"
WHERE "item"."id" = "event"."courseItemId";

ALTER TABLE "AssessmentEvent" ALTER COLUMN "assessmentId" SET NOT NULL,
ALTER COLUMN "courseItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AssessmentAttempt" ALTER COLUMN "courseItemId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AssessmentEvent_assessmentId_idx" ON "AssessmentEvent"("assessmentId");

-- AddForeignKey
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_assessmentId_organizationId_fkey" FOREIGN KEY ("assessmentId", "organizationId") REFERENCES "Assessment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
