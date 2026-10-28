-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentQuestionGroup" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "instructions" JSONB,
    "stimulus" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentQuestionGroup_assessmentId_idx" ON "AssessmentQuestionGroup"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_groupId_idx" ON "AssessmentQuestion"("groupId");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AssessmentQuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestionGroup" ADD CONSTRAINT "AssessmentQuestionGroup_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Group changes (instructions, stimulus) are assessment content: tell mobile clients like
-- question and section changes, through the same statement-level trigger function.
CREATE TRIGGER mobile_sync_change_insert AFTER INSERT ON "AssessmentQuestionGroup"
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION mobile_sync_change_assessment_child();
CREATE TRIGGER mobile_sync_change_update AFTER UPDATE ON "AssessmentQuestionGroup"
    REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION mobile_sync_change_assessment_child();
CREATE TRIGGER mobile_sync_change_delete AFTER DELETE ON "AssessmentQuestionGroup"
    REFERENCING OLD TABLE AS old_rows
    FOR EACH STATEMENT EXECUTE FUNCTION mobile_sync_change_assessment_child();
