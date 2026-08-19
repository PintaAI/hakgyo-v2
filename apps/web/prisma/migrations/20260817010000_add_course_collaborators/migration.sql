CREATE TYPE "CourseCollaboratorRole" AS ENUM ('EDITOR');

CREATE TABLE "CourseCollaborator" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "role" "CourseCollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseCollaborator_courseId_organizationMemberId_key"
ON "CourseCollaborator"("courseId", "organizationMemberId");

CREATE INDEX "CourseCollaborator_organizationMemberId_idx"
ON "CourseCollaborator"("organizationMemberId");

ALTER TABLE "CourseCollaborator"
ADD CONSTRAINT "CourseCollaborator_courseId_organizationId_fkey"
FOREIGN KEY ("courseId", "organizationId")
REFERENCES "Course"("id", "organizationId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseCollaborator"
ADD CONSTRAINT "CourseCollaborator_organizationMemberId_organizationId_fkey"
FOREIGN KEY ("organizationMemberId", "organizationId")
REFERENCES "OrganizationMember"("id", "organizationId")
ON DELETE CASCADE ON UPDATE CASCADE;
