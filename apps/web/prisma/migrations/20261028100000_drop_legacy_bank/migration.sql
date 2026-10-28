-- The question bank moved to its own tables (20261028090000_standalone_bank). This drops what the
-- earlier bank-as-assessment design added: its triggers, columns, enum and statistics table.

DROP TRIGGER IF EXISTS bank_question_default_status ON "AssessmentQuestion";
DROP TRIGGER IF EXISTS bank_question_keep ON "AssessmentQuestion";
DROP TRIGGER IF EXISTS bank_question_rereview ON "AssessmentQuestion";
DROP TRIGGER IF EXISTS bank_option_rereview ON "AssessmentOption";
DROP TRIGGER IF EXISTS refuse_bank_assessment ON "CourseItem";
DROP TRIGGER IF EXISTS refuse_bank_assessment ON "MaterialRequirement";
DROP TRIGGER IF EXISTS refuse_bank_assessment ON "PublicQuiz";
DROP FUNCTION IF EXISTS bank_question_default_status();
DROP FUNCTION IF EXISTS bank_question_keep();
DROP FUNCTION IF EXISTS bank_question_rereview();
DROP FUNCTION IF EXISTS bank_option_rereview();
DROP FUNCTION IF EXISTS refuse_bank_assessment();

-- Jobs of the old design have no bank question; nothing else could finish them.
DELETE FROM "TtsJob" WHERE "bankQuestionId" IS NULL;

-- DropForeignKey
ALTER TABLE "BankItemStats" DROP CONSTRAINT "BankItemStats_questionId_fkey";

-- DropForeignKey
ALTER TABLE "TtsJob" DROP CONSTRAINT "TtsJob_questionId_fkey";

-- DropIndex
DROP INDEX "AssessmentQuestion_assessmentId_bankStatus_idx";

-- DropIndex
DROP INDEX "AssessmentQuestion_tags_idx";

-- DropIndex
DROP INDEX "TtsJob_questionId_idx";

-- AlterTable
ALTER TABLE "Assessment" DROP COLUMN "contentLocked",
DROP COLUMN "kind";

-- AlterTable
ALTER TABLE "AssessmentQuestion" DROP COLUMN "bankMeta",
DROP COLUMN "bankStatus";

-- AlterTable
ALTER TABLE "TtsJob" DROP COLUMN "questionId",
ALTER COLUMN "bankQuestionId" SET NOT NULL;

-- DropTable
DROP TABLE "BankItemStats";

-- DropEnum
DROP TYPE "AssessmentKind";

