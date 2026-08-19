ALTER TABLE "AssessmentAttempt"
ADD COLUMN "cohortId" TEXT;

WITH "AttemptCohorts" AS (
  SELECT
    "attempt"."id" AS "attemptId",
    MIN("cohortEnrollment"."cohortId") AS "cohortId"
  FROM "AssessmentAttempt" AS "attempt"
  JOIN "CourseItem" AS "item" ON "item"."id" = "attempt"."courseItemId"
  JOIN "CourseModule" AS "module" ON "module"."id" = "item"."moduleId"
  JOIN "Cohort" AS "cohort" ON "cohort"."courseId" = "module"."courseId"
  JOIN "CohortEnrollment" AS "cohortEnrollment"
    ON "cohortEnrollment"."cohortId" = "cohort"."id"
    AND "cohortEnrollment"."userId" = "attempt"."userId"
    AND "cohortEnrollment"."status" IN ('ACTIVE', 'COMPLETED')
  GROUP BY "attempt"."id"
  HAVING COUNT(DISTINCT "cohortEnrollment"."cohortId") = 1
)
UPDATE "AssessmentAttempt" AS "attempt"
SET "cohortId" = "candidate"."cohortId"
FROM "AttemptCohorts" AS "candidate"
WHERE "candidate"."attemptId" = "attempt"."id";

CREATE INDEX "AssessmentAttempt_cohortId_status_idx"
ON "AssessmentAttempt"("cohortId", "status");

ALTER TABLE "AssessmentAttempt"
ADD CONSTRAINT "AssessmentAttempt_cohortId_fkey"
FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
