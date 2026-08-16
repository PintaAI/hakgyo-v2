CREATE TYPE "TeacherAccessScope" AS ENUM ('OWN_ONLY', 'ALL');

ALTER TABLE "Organization"
ADD COLUMN "teacherCourseAccess" "TeacherAccessScope" NOT NULL DEFAULT 'OWN_ONLY',
ADD COLUMN "teacherContentAccess" "TeacherAccessScope" NOT NULL DEFAULT 'OWN_ONLY',
ADD COLUMN "teacherCanDeleteContent" BOOLEAN NOT NULL DEFAULT false;
