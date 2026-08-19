ALTER TYPE "CohortStaffRole" RENAME VALUE 'TEACHER' TO 'INSTRUCTOR';
ALTER TYPE "CohortStaffRole" RENAME VALUE 'MODERATOR' TO 'ASSISTANT';

CREATE TYPE "OrganizationPermissionMode" AS ENUM ('SIMPLE', 'ADVANCED');

ALTER TABLE "Organization"
ADD COLUMN "teacherCanCreateCourse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "permissionMode" "OrganizationPermissionMode" NOT NULL DEFAULT 'SIMPLE',
DROP COLUMN "teacherCourseAccess",
DROP COLUMN "teacherContentAccess",
DROP COLUMN "teacherCanDeleteContent";

-- Preserve the existing access model for organizations created before this migration.
UPDATE "Organization" SET "permissionMode" = 'ADVANCED';

DROP TYPE "TeacherAccessScope";
