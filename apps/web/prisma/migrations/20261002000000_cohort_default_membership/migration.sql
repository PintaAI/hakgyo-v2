-- Each course gets at most one system self-paced cohort, marked by
-- "defaultForCourseId". It holds learners who study without a class cohort,
-- so course access can later be read from cohort memberships alone.
ALTER TABLE "Cohort" ADD COLUMN "defaultForCourseId" TEXT;
CREATE UNIQUE INDEX "Cohort_defaultForCourseId_key" ON "Cohort"("defaultForCourseId");
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_defaultForCourseId_check" CHECK ("defaultForCourseId" IS NULL OR "defaultForCourseId" = "courseId");

ALTER TABLE "CohortEnrollment" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill: a default cohort for every course with a direct enrollment, and a
-- membership mirroring each direct enrollment. Rows with source COHORT only
-- shadow class cohort memberships and are not copied.
INSERT INTO "Cohort" ("id", "courseId", "organizationId", "name", "status", "defaultForCourseId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, course."id", course."organizationId", 'Belajar mandiri', 'OPEN', course."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Course" AS course
WHERE EXISTS (
    SELECT 1 FROM "CourseEnrollment" AS enrollment
    WHERE enrollment."courseId" = course."id" AND enrollment."source" <> 'COHORT'
)
ON CONFLICT ("defaultForCourseId") DO NOTHING;

INSERT INTO "CohortEnrollment" ("id", "cohortId", "userId", "status", "source", "enrolledAt", "completedAt", "expiresAt")
SELECT gen_random_uuid()::text, cohort."id", enrollment."userId", enrollment."status", enrollment."source", enrollment."enrolledAt", enrollment."completedAt", enrollment."expiresAt"
FROM "CourseEnrollment" AS enrollment
JOIN "Cohort" AS cohort ON cohort."defaultForCourseId" = enrollment."courseId"
WHERE enrollment."source" <> 'COHORT'
ON CONFLICT ("cohortId", "userId") DO NOTHING;
