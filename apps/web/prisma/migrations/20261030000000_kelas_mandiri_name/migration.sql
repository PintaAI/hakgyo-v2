-- Each course's open-ended default cohort is now a visible class named
-- "Kelas Mandiri". Data only: renames those still carrying the old system name.
UPDATE "Cohort"
SET "name" = 'Kelas Mandiri', "updatedAt" = CURRENT_TIMESTAMP
WHERE "defaultForCourseId" IS NOT NULL
  AND "name" = 'Belajar mandiri';
