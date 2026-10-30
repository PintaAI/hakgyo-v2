-- Price and join mode now live only on the class. Data only: copies the
-- curriculum's price and join mode into its classes that still inherit them.
-- The Course columns stay until a later migration drops them.
UPDATE "Cohort" AS c
SET "price" = co."price", "updatedAt" = CURRENT_TIMESTAMP
FROM "Course" AS co
WHERE c."courseId" = co."id"
  AND c."price" IS NULL;

UPDATE "Cohort" AS c
SET "enrollmentMode" = co."enrollmentMode", "updatedAt" = CURRENT_TIMESTAMP
FROM "Course" AS co
WHERE c."courseId" = co."id"
  AND c."enrollmentMode" IS NULL
  AND co."enrollmentMode" IS NOT NULL;
