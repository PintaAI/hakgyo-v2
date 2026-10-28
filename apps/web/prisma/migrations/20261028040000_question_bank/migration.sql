-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('STANDARD', 'BANK', 'GENERATED');

-- CreateEnum
CREATE TYPE "BankItemStatus" AS ENUM ('DRAFT', 'REVIEW', 'LIVE', 'RETIRED');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "kind" "AssessmentKind" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN     "bankStatus" "BankItemStatus";

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_bankStatus_idx" ON "AssessmentQuestion"("assessmentId", "bankStatus");


-- Every way a question enters a bank (editor, AI import, MCP) starts it as a draft.
CREATE FUNCTION bank_question_default_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."bankStatus" IS NULL AND EXISTS (
        SELECT 1 FROM "Assessment" WHERE "id" = NEW."assessmentId" AND "kind" = 'BANK'
    ) THEN
        NEW."bankStatus" := 'DRAFT';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER bank_question_default_status BEFORE INSERT ON "AssessmentQuestion"
    FOR EACH ROW EXECUTE FUNCTION bank_question_default_status();

-- Bank questions are retired, never deleted, so package copies and statistics keep their source.
CREATE FUNCTION bank_question_keep() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."bankStatus" IS NOT NULL THEN
        RAISE EXCEPTION 'Bank question % cannot be deleted', OLD."id" USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER bank_question_keep BEFORE DELETE ON "AssessmentQuestion"
    FOR EACH ROW EXECUTE FUNCTION bank_question_keep();
