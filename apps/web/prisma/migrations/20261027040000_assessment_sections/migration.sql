-- CreateEnum
CREATE TYPE "AssessmentSectionNavigation" AS ENUM ('FREE', 'FORWARD_ONLY', 'PACED');

-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentSection" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" JSONB,
    "timeLimitSeconds" INTEGER,
    "navigation" "AssessmentSectionNavigation" NOT NULL DEFAULT 'FREE',
    "lockAnswers" BOOLEAN NOT NULL DEFAULT false,
    "allowEarlyFinish" BOOLEAN NOT NULL DEFAULT true,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "audioMaxPlays" INTEGER,
    "audioAutoplay" BOOLEAN NOT NULL DEFAULT false,
    "audioRepeatGapSeconds" INTEGER NOT NULL DEFAULT 2,
    "pacedAnswerSeconds" INTEGER,
    "pacedQuestionSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSection_assessmentId_position_key" ON "AssessmentSection"("assessmentId", "position");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_sectionId_idx" ON "AssessmentQuestion"("sectionId");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

