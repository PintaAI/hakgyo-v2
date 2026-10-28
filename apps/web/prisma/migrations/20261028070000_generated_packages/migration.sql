-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "contentLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN     "sourceQuestionId" TEXT;

-- AlterTable
ALTER TABLE "AssessmentQuestionGroup" ADD COLUMN     "sourceGroupId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentGeneration" (
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "blueprintKey" TEXT NOT NULL,
    "blueprintVersion" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "picks" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentGeneration_pkey" PRIMARY KEY ("assessmentId")
);

-- CreateIndex
CREATE INDEX "AssessmentGeneration_organizationId_idx" ON "AssessmentGeneration"("organizationId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_sourceQuestionId_idx" ON "AssessmentQuestion"("sourceQuestionId");

-- AddForeignKey
ALTER TABLE "AssessmentGeneration" ADD CONSTRAINT "AssessmentGeneration_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

