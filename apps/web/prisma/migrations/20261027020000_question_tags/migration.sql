-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "AssessmentQuestion_tags_idx" ON "AssessmentQuestion" USING GIN ("tags");

