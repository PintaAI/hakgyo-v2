-- Simplify publishing.
--
-- Learner visibility is now Course.status = 'PUBLISHED' AND CourseItem.isPublished.
-- Library resources (materials, vocabulary sets, assessments) no longer carry a
-- publish state: Assessment.status / Assessment.publishedAt and the
-- AssessmentStatus enum are removed, and CourseStatus loses ARCHIVED.

BEGIN;

-------------------------------------------------------------------------------
-- 1. Data: keep today's learner visibility.
-------------------------------------------------------------------------------

-- Items placing an assessment that learners could not see (DRAFT/ARCHIVED)
-- become hidden items, so dropping the status does not expose them.
UPDATE "CourseItem"
SET "isPublished" = false
WHERE "isPublished"
  AND "assessmentId" IN (SELECT "id" FROM "Assessment" WHERE "status" <> 'PUBLISHED');

-- Archived courses were already hidden from learners; they become unpublished.
UPDATE "Course" SET "status" = 'DRAFT' WHERE "status" = 'ARCHIVED';

-------------------------------------------------------------------------------
-- 2. Mobile sync triggers: stop reading Assessment.status.
--
-- plpgsql/sql bodies are not dependency-tracked, so dropping the column below
-- would only fail at runtime, on the next write to an assessment. An
-- assessment reaches learners only through a published item in a published
-- course, which mobile_sync_emit_assessments already resolves.
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mobile_sync_emit_assets(asset_ids TEXT[]) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM mobile_sync_emit_materials(
        array_agg(link."materialId"), ARRAY['content'], 'asset', array_agg(link."assetId"))
    FROM "MaterialAsset" link
    WHERE link."assetId" = ANY (asset_ids);

    PERFORM mobile_sync_emit_vocabulary_sets(
        array_agg(entry."vocabularySetId"), ARRAY['content'], 'asset', array_agg(a.id))
    FROM unnest(asset_ids) AS a(id)
    JOIN "VocabularyEntry" entry
        ON entry."audioAssetId" = a.id OR entry."imageAssetId" = a.id;

    PERFORM mobile_sync_emit_assessments(
        array_agg(link."assessmentId"), ARRAY['content'], 'asset', array_agg(link."assetId"))
    FROM "AssessmentAsset" link
    WHERE link."assetId" = ANY (asset_ids);
END;
$$;

-- Assessment: content on every change; structure too when the title or
-- passingScore changed. Placement filtering (published item in a published
-- course) happens in mobile_sync_emit_assessments.
CREATE OR REPLACE FUNCTION mobile_sync_change_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM mobile_sync_emit_assessments(array_agg("id"), ARRAY['content', 'structure'])
        FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM mobile_sync_emit_assessments(array_agg("id"), ARRAY['content', 'structure'])
        FROM old_rows;
    ELSE
        PERFORM mobile_sync_emit_assessments(array_agg(n."id"), ARRAY['content'])
        FROM old_rows o JOIN new_rows n ON n."id" = o."id";
        PERFORM mobile_sync_emit_assessments(array_agg(n."id"), ARRAY['structure'])
        FROM old_rows o JOIN new_rows n ON n."id" = o."id"
        WHERE o."title" IS DISTINCT FROM n."title"
           OR o."passingScore" IS DISTINCT FROM n."passingScore";
    END IF;
    RETURN NULL;
END;
$$;

-- AssessmentQuestion / AssessmentAsset: content of the assessment.
CREATE OR REPLACE FUNCTION mobile_sync_change_assessment_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    assessment_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "assessmentId") INTO assessment_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "assessmentId") INTO assessment_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "assessmentId") INTO assessment_ids
        FROM (SELECT "assessmentId" FROM old_rows UNION ALL SELECT "assessmentId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit_assessments(assessment_ids, ARRAY['content']);
    RETURN NULL;
END;
$$;

-- AssessmentOption: content of the assessment via the question.
CREATE OR REPLACE FUNCTION mobile_sync_change_assessment_option() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    question_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "questionId") INTO question_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "questionId") INTO question_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "questionId") INTO question_ids
        FROM (SELECT "questionId" FROM old_rows UNION ALL SELECT "questionId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit_assessments(array_agg(DISTINCT question."assessmentId"), ARRAY['content'])
    FROM "AssessmentQuestion" question
    WHERE question."id" = ANY (question_ids);
    RETURN NULL;
END;
$$;

-------------------------------------------------------------------------------
-- 3. Drop the assessment publish state.
-------------------------------------------------------------------------------

DROP INDEX "Assessment_organizationId_status_idx";

ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_publishedAt_check";

ALTER TABLE "Assessment" DROP COLUMN "publishedAt",
DROP COLUMN "status";

DROP TYPE "AssessmentStatus";

-------------------------------------------------------------------------------
-- 4. CourseStatus without ARCHIVED (Prisma's enum rewrite pattern).
-------------------------------------------------------------------------------

CREATE TYPE "CourseStatus_new" AS ENUM ('DRAFT', 'PUBLISHED');
ALTER TABLE "Course" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Course" ALTER COLUMN "status" TYPE "CourseStatus_new" USING ("status"::text::"CourseStatus_new");
ALTER TYPE "CourseStatus" RENAME TO "CourseStatus_old";
ALTER TYPE "CourseStatus_new" RENAME TO "CourseStatus";
DROP TYPE "CourseStatus_old";
ALTER TABLE "Course" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

COMMIT;
