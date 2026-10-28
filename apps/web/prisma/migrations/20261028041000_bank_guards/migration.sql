-- The question bank (an assessment of kind BANK) is never placed in a course, required by a lesson
-- or published as a public quiz; packages are built from it instead (docs/eps-question-generator.md).
CREATE FUNCTION refuse_bank_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."assessmentId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "Assessment" WHERE "id" = NEW."assessmentId" AND "kind" = 'BANK'
    ) THEN
        RAISE EXCEPTION 'The question bank % cannot be used here', NEW."assessmentId" USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER refuse_bank_assessment BEFORE INSERT OR UPDATE OF "assessmentId" ON "CourseItem"
    FOR EACH ROW EXECUTE FUNCTION refuse_bank_assessment();
CREATE TRIGGER refuse_bank_assessment BEFORE INSERT OR UPDATE OF "assessmentId" ON "MaterialRequirement"
    FOR EACH ROW EXECUTE FUNCTION refuse_bank_assessment();
CREATE TRIGGER refuse_bank_assessment BEFORE INSERT OR UPDATE OF "assessmentId" ON "PublicQuiz"
    FOR EACH ROW EXECUTE FUNCTION refuse_bank_assessment();

-- A whole bank may go with its assessment (organization removal); single bank questions are
-- retired, never deleted. Cascaded deletes run after the parent row is gone.
CREATE OR REPLACE FUNCTION bank_question_keep() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."bankStatus" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "Assessment" WHERE "id" = OLD."assessmentId"
    ) THEN
        RAISE EXCEPTION 'Bank question % cannot be deleted', OLD."id" USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$;

-- Changing an approved question (its content, type, tags or options) sends it back to review, so
-- nothing reaches packages without the founder's check.
CREATE FUNCTION bank_question_rereview() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."bankStatus" = 'LIVE' AND NEW."bankStatus" = 'LIVE' AND (
        NEW."prompt" IS DISTINCT FROM OLD."prompt" OR
        NEW."explanation" IS DISTINCT FROM OLD."explanation" OR
        NEW."type" IS DISTINCT FROM OLD."type" OR
        NEW."tags" IS DISTINCT FROM OLD."tags" OR
        NEW."groupId" IS DISTINCT FROM OLD."groupId"
    ) THEN
        NEW."bankStatus" := 'REVIEW';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER bank_question_rereview BEFORE UPDATE ON "AssessmentQuestion"
    FOR EACH ROW EXECUTE FUNCTION bank_question_rereview();

CREATE FUNCTION bank_option_rereview() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    question_id TEXT := COALESCE(NEW."questionId", OLD."questionId");
BEGIN
    IF TG_OP <> 'UPDATE' OR NEW."content" IS DISTINCT FROM OLD."content"
        OR NEW."isCorrect" IS DISTINCT FROM OLD."isCorrect" THEN
        UPDATE "AssessmentQuestion" SET "bankStatus" = 'REVIEW'
        WHERE "id" = question_id AND "bankStatus" = 'LIVE';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER bank_option_rereview AFTER INSERT OR UPDATE OR DELETE ON "AssessmentOption"
    FOR EACH ROW EXECUTE FUNCTION bank_option_rereview();
