-- CreateEnum
CREATE TYPE "AssessmentSectionEndReason" AS ENUM ('FINISHED', 'TIME_UP', 'SUBMITTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssessmentLogKind" ADD VALUE 'SECTION_STARTED';
ALTER TYPE "AssessmentLogKind" ADD VALUE 'SECTION_ENDED';

-- AlterTable
ALTER TABLE "AssessmentAttemptLog" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentAttemptSection" (
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" "AssessmentSectionEndReason",
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,

    CONSTRAINT "AssessmentAttemptSection_pkey" PRIMARY KEY ("attemptId","sectionId")
);

-- CreateIndex
CREATE INDEX "AssessmentAttemptSection_sectionId_idx" ON "AssessmentAttemptSection"("sectionId");

-- AddForeignKey
ALTER TABLE "AssessmentAttemptSection" ADD CONSTRAINT "AssessmentAttemptSection_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttemptSection" ADD CONSTRAINT "AssessmentAttemptSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

