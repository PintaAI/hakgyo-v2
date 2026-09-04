ALTER TABLE "UserActivityEvent"
ADD COLUMN "organizationId" TEXT;

UPDATE "UserActivityEvent" AS event
SET "organizationId" = course."organizationId"
FROM "CourseItem" AS item
JOIN "CourseModule" AS module ON module."id" = item."moduleId"
JOIN "Course" AS course ON course."id" = module."courseId"
WHERE event."organizationId" IS NULL
  AND event."metadata"->>'courseItemId' = item."id";

ALTER TABLE "UserActivityEvent"
ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "UserActivityEvent_organizationId_occurredAt_idx"
ON "UserActivityEvent"("organizationId", "occurredAt");

ALTER TABLE "UserActivityEvent"
ADD CONSTRAINT "UserActivityEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
