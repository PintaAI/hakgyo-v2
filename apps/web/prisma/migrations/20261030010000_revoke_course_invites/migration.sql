-- Learners now join a curriculum only through one of its classes, so
-- course-level invite links (no class) are retired. Data only: revokes the
-- ones still active. The rows stay, so their links show "Undangan tidak
-- berlaku" and payments that reference them keep their history.
UPDATE "EnrollmentInvite"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "cohortId" IS NULL
  AND "revokedAt" IS NULL;
