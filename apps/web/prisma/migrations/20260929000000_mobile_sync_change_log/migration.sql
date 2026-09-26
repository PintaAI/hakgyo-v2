-- Replace the per-scope MobileSyncRevision counter with an append-only change
-- log.
--
-- The counter row was upserted by every write in an organization, so the row
-- lock was held until commit (serializing unrelated writers) and any write,
-- including teacher draft autosaves and unpublished content, forced every
-- learner in the organization to re-download the dashboard.
--
-- MobileSyncChange records one row per (transaction, scope, kind, entity).
-- Triggers only INSERT ... ON CONFLICT DO NOTHING, so concurrent writers never
-- wait on each other. A scope's revision is the newest transaction id below
-- the reader's snapshot horizon (see src/server/mobile/sync-log.ts), which
-- makes revisions monotonic even when transactions commit out of order.
--
-- Triggers emit ONLY learner-visible changes:
-- * course/structure, course/content, course/roster (scopeId = course id),
--   limited to PUBLISHED courses and, for content, to resources placed in
--   published course items.
-- * user/state (scopeId = user id) for learner-owned rows.
-- * organization/meta (scopeId = organization id) for the organization row
--   itself.

-------------------------------------------------------------------------------
-- Drop the counter mechanism.
-------------------------------------------------------------------------------

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'Organization', 'Course', 'Cohort', 'CohortMeeting',
        'CourseModule', 'CourseItem', 'Material', 'MaterialRequirement',
        'Assessment', 'VocabularySet', 'VocabularyEntry', 'AssessmentEvent',
        'Asset', 'AssessmentAsset', 'MaterialAsset', 'CohortStaff',
        'OrganizationMember', 'CourseEnrollment', 'CohortEnrollment',
        'ContentProgress', 'UserActivityEvent', 'UserGamification',
        'UserAchievement', 'AssessmentAttempt', 'AssessmentEventParticipant',
        'VocabularyProgress', 'VocabularyPracticeAttempt', 'learnerSidebarSeen'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS mobile_sync_revision_insert ON %I', table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS mobile_sync_revision_update ON %I', table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS mobile_sync_revision_delete ON %I', table_name);
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY[
        'AssessmentQuestion', 'AssessmentOption', 'AssessmentAnswer',
        'AssessmentAnswerSelection'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS mobile_sync_related_revision_insert ON %I', table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS mobile_sync_related_revision_update ON %I', table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS mobile_sync_related_revision_delete ON %I', table_name);
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS bump_mobile_sync_revision();
DROP FUNCTION IF EXISTS bump_mobile_sync_related_revision();
DROP TABLE IF EXISTS "MobileSyncRevision";

-------------------------------------------------------------------------------
-- Change log.
-------------------------------------------------------------------------------

CREATE TABLE "MobileSyncChange" (
    "id" BIGSERIAL NOT NULL,
    "txid" xid8 NOT NULL DEFAULT pg_current_xact_id(),
    -- 'course' | 'user' | 'organization'
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    -- course: 'structure' | 'content' | 'roster'; user: 'state'; organization: 'meta'
    "kind" TEXT NOT NULL,
    -- 'item' | 'material' | 'vocabularySet' | 'assessment' | 'pdfBook' | 'asset' | ''
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MobileSyncChange_pkey" PRIMARY KEY ("id")
);

-- One row per transaction and entity; ON CONFLICT DO NOTHING makes repeated
-- emission within a transaction free.
CREATE UNIQUE INDEX "MobileSyncChange_dedupe"
    ON "MobileSyncChange"("txid", "scopeType", "scopeId", "kind", "entityType", "entityId");
-- Revision lookup: newest txid per scope below the snapshot horizon.
CREATE INDEX "MobileSyncChange_scope_txid"
    ON "MobileSyncChange"("scopeType", "scopeId", "kind", "txid" DESC);
-- Compaction by age.
CREATE INDEX "MobileSyncChange_createdAt" ON "MobileSyncChange"("createdAt");

-- Single row recording how far the log has been compacted. Deltas that start
-- below "floorTxid" cannot be served from the log.
CREATE TABLE "MobileSyncCompaction" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "floorTxid" xid8,
    "compactedAt" TIMESTAMPTZ,
    CONSTRAINT "MobileSyncCompaction_pkey" PRIMARY KEY ("id")
);

-------------------------------------------------------------------------------
-- Emission helpers. Every helper is set-based and takes id arrays so a
-- statement-level trigger emits once per statement regardless of row count.
-------------------------------------------------------------------------------

-- Emit (scope_type, scope_id, kind) for every scope id and kind combination.
CREATE FUNCTION mobile_sync_emit(
    scope_type TEXT,
    scope_ids TEXT[],
    kinds TEXT[],
    entity_type TEXT DEFAULT '',
    entity_id TEXT DEFAULT ''
) RETURNS void LANGUAGE sql AS $$
    INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
    SELECT DISTINCT scope_type, s.id, k.kind, entity_type, entity_id
    FROM unnest(scope_ids) AS s(id)
    CROSS JOIN unnest(kinds) AS k(kind)
    WHERE s.id IS NOT NULL
    ON CONFLICT DO NOTHING;
$$;

-- Emit course/<kind> for every published course item placing one of the
-- materials in a PUBLISHED course. entity_ids parallels material_ids and
-- defaults to the material ids themselves.
CREATE FUNCTION mobile_sync_emit_materials(
    material_ids TEXT[],
    kinds TEXT[],
    entity_type TEXT DEFAULT 'material',
    entity_ids TEXT[] DEFAULT NULL
) RETURNS void LANGUAGE sql AS $$
    INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
    SELECT DISTINCT 'course', module."courseId", k.kind, entity_type, m.entity_id
    FROM unnest(material_ids, COALESCE(entity_ids, material_ids)) AS m(id, entity_id)
    JOIN "CourseItem" item ON item."materialId" = m.id AND item."isPublished"
    JOIN "CourseModule" module ON module."id" = item."moduleId"
    JOIN "Course" course ON course."id" = module."courseId" AND course."status" = 'PUBLISHED'
    CROSS JOIN unnest(kinds) AS k(kind)
    WHERE m.id IS NOT NULL
    ON CONFLICT DO NOTHING;
$$;

CREATE FUNCTION mobile_sync_emit_vocabulary_sets(
    set_ids TEXT[],
    kinds TEXT[],
    entity_type TEXT DEFAULT 'vocabularySet',
    entity_ids TEXT[] DEFAULT NULL
) RETURNS void LANGUAGE sql AS $$
    INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
    SELECT DISTINCT 'course', module."courseId", k.kind, entity_type, s.entity_id
    FROM unnest(set_ids, COALESCE(entity_ids, set_ids)) AS s(id, entity_id)
    JOIN "CourseItem" item ON item."vocabularySetId" = s.id AND item."isPublished"
    JOIN "CourseModule" module ON module."id" = item."moduleId"
    JOIN "Course" course ON course."id" = module."courseId" AND course."status" = 'PUBLISHED'
    CROSS JOIN unnest(kinds) AS k(kind)
    WHERE s.id IS NOT NULL
    ON CONFLICT DO NOTHING;
$$;

-- Callers decide whether the assessment is learner-visible (PUBLISHED before
-- or after the change); this helper only resolves placements.
CREATE FUNCTION mobile_sync_emit_assessments(
    assessment_ids TEXT[],
    kinds TEXT[],
    entity_type TEXT DEFAULT 'assessment',
    entity_ids TEXT[] DEFAULT NULL
) RETURNS void LANGUAGE sql AS $$
    INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
    SELECT DISTINCT 'course', module."courseId", k.kind, entity_type, a.entity_id
    FROM unnest(assessment_ids, COALESCE(entity_ids, assessment_ids)) AS a(id, entity_id)
    JOIN "CourseItem" item ON item."assessmentId" = a.id AND item."isPublished"
    JOIN "CourseModule" module ON module."id" = item."moduleId"
    JOIN "Course" course ON course."id" = module."courseId" AND course."status" = 'PUBLISHED'
    CROSS JOIN unnest(kinds) AS k(kind)
    WHERE a.id IS NOT NULL
    ON CONFLICT DO NOTHING;
$$;

-- Assets reach learners through materials (MaterialAsset, which also covers
-- PDF book pages), vocabulary entries (audio/image) and published
-- assessments (AssessmentAsset).
CREATE FUNCTION mobile_sync_emit_assets(asset_ids TEXT[]) RETURNS void
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
    JOIN "Assessment" assessment ON assessment."id" = link."assessmentId"
    WHERE link."assetId" = ANY (asset_ids)
      AND assessment."status" = 'PUBLISHED';
END;
$$;

-- PDF books reach learners through their page assets linked to materials.
CREATE FUNCTION mobile_sync_emit_pdf_books(book_ids TEXT[]) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM mobile_sync_emit_materials(
        array_agg(link."materialId"), ARRAY['content'], 'pdfBook', array_agg(page."bookId"))
    FROM "PdfBookPage" page
    JOIN "MaterialAsset" link ON link."assetId" = page."assetId"
    WHERE page."bookId" = ANY (book_ids);
END;
$$;

-------------------------------------------------------------------------------
-- Trigger functions. PostgreSQL requires one trigger per event when
-- transition tables are used; each function branches on TG_OP and reads
-- old_rows / new_rows only when they exist for that event.
-------------------------------------------------------------------------------

-- Generic: emit TG_ARGV[0]/TG_ARGV[1] for the distinct values of column
-- TG_ARGV[2] in the changed rows (old and new on UPDATE).
CREATE FUNCTION mobile_sync_change_column() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        EXECUTE format('SELECT array_agg(DISTINCT %I) FROM new_rows', TG_ARGV[2]) INTO ids;
    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('SELECT array_agg(DISTINCT %I) FROM old_rows', TG_ARGV[2]) INTO ids;
    ELSE
        EXECUTE format(
            'SELECT array_agg(DISTINCT id) FROM (SELECT %1$I AS id FROM old_rows UNION ALL SELECT %1$I FROM new_rows) changed',
            TG_ARGV[2]) INTO ids;
    END IF;
    PERFORM mobile_sync_emit(TG_ARGV[0], ids, ARRAY[TG_ARGV[1]]);
    RETURN NULL;
END;
$$;

-- Course: structure + roster whenever the course is or was PUBLISHED. A course
-- leaving the published set needs nothing more: it drops out of the learner's
-- manifest, which changes their index token.
CREATE FUNCTION mobile_sync_change_course() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    course_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg("id") INTO course_ids FROM new_rows WHERE "status" = 'PUBLISHED';
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg("id") INTO course_ids FROM old_rows WHERE "status" = 'PUBLISHED';
    ELSE
        SELECT array_agg(n."id") INTO course_ids
        FROM old_rows o JOIN new_rows n ON n."id" = o."id"
        WHERE o."status" = 'PUBLISHED' OR n."status" = 'PUBLISHED';
    END IF;
    PERFORM mobile_sync_emit('course', course_ids, ARRAY['structure', 'roster']);
    RETURN NULL;
END;
$$;

-- CourseModule: structure of the (published) course.
CREATE FUNCTION mobile_sync_change_course_module() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    course_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "courseId") INTO course_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "courseId") INTO course_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "courseId") INTO course_ids
        FROM (SELECT "courseId" FROM old_rows UNION ALL SELECT "courseId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit('course', array_agg("id"), ARRAY['structure'])
    FROM "Course" WHERE "id" = ANY (course_ids) AND "status" = 'PUBLISHED';
    RETURN NULL;
END;
$$;

-- CourseItem: structure (entity item) when the item is or was published, for
-- the old and new module's course.
CREATE FUNCTION mobile_sync_change_course_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
        SELECT DISTINCT 'course', module."courseId", 'structure', 'item', item."id"
        FROM new_rows item
        JOIN "CourseModule" module ON module."id" = item."moduleId"
        JOIN "Course" course ON course."id" = module."courseId" AND course."status" = 'PUBLISHED'
        WHERE item."isPublished"
        ON CONFLICT DO NOTHING;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
        SELECT DISTINCT 'course', module."courseId", 'structure', 'item', item."id"
        FROM old_rows item
        JOIN "CourseModule" module ON module."id" = item."moduleId"
        JOIN "Course" course ON course."id" = module."courseId" AND course."status" = 'PUBLISHED'
        WHERE item."isPublished"
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO "MobileSyncChange" ("scopeType", "scopeId", "kind", "entityType", "entityId")
        SELECT DISTINCT 'course', module."courseId", 'structure', 'item', item."id"
        FROM (
            SELECT o."id", o."moduleId" FROM old_rows o JOIN new_rows n ON n."id" = o."id"
            WHERE o."isPublished" OR n."isPublished"
            UNION
            SELECT n."id", n."moduleId" FROM old_rows o JOIN new_rows n ON n."id" = o."id"
            WHERE o."isPublished" OR n."isPublished"
        ) item
        JOIN "CourseModule" module ON module."id" = item."moduleId"
        JOIN "Course" course ON course."id" = module."courseId" AND course."status" = 'PUBLISHED'
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NULL;
END;
$$;

-- Material: content on UPDATE/DELETE; structure too when the title changed.
CREATE FUNCTION mobile_sync_change_material() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM mobile_sync_emit_materials(array_agg("id"), ARRAY['content']) FROM new_rows;
        PERFORM mobile_sync_emit_materials(array_agg(n."id"), ARRAY['structure'])
        FROM old_rows o JOIN new_rows n ON n."id" = o."id"
        WHERE o."title" IS DISTINCT FROM n."title";
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM mobile_sync_emit_materials(array_agg("id"), ARRAY['content']) FROM old_rows;
    END IF;
    RETURN NULL;
END;
$$;

-- MaterialRequirement / MaterialAsset: content of the material.
CREATE FUNCTION mobile_sync_change_material_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    material_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "materialId") INTO material_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "materialId") INTO material_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "materialId") INTO material_ids
        FROM (SELECT "materialId" FROM old_rows UNION ALL SELECT "materialId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit_materials(material_ids, ARRAY['content']);
    RETURN NULL;
END;
$$;

-- Asset: UPDATE only, when a learner-visible column changed, and only for
-- assets linked to published content. Uploads (INSERT) are invisible until
-- linked, and the link row emits.
CREATE FUNCTION mobile_sync_change_asset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM mobile_sync_emit_assets(array_agg(n."id"))
    FROM old_rows o JOIN new_rows n ON n."id" = o."id"
    WHERE o."confirmedAt" IS DISTINCT FROM n."confirmedAt"
       OR o."deletedAt" IS DISTINCT FROM n."deletedAt"
       OR o."fileName" IS DISTINCT FROM n."fileName"
       OR o."contentType" IS DISTINCT FROM n."contentType"
       OR o."size" IS DISTINCT FROM n."size";
    RETURN NULL;
END;
$$;

-- Assessment: content when it is or was PUBLISHED; structure too when
-- status, title or passingScore changed.
CREATE FUNCTION mobile_sync_change_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM mobile_sync_emit_assessments(array_agg("id"), ARRAY['content', 'structure'])
        FROM new_rows WHERE "status" = 'PUBLISHED';
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM mobile_sync_emit_assessments(array_agg("id"), ARRAY['content', 'structure'])
        FROM old_rows WHERE "status" = 'PUBLISHED';
    ELSE
        PERFORM mobile_sync_emit_assessments(array_agg(n."id"), ARRAY['content'])
        FROM old_rows o JOIN new_rows n ON n."id" = o."id"
        WHERE o."status" = 'PUBLISHED' OR n."status" = 'PUBLISHED';
        PERFORM mobile_sync_emit_assessments(array_agg(n."id"), ARRAY['structure'])
        FROM old_rows o JOIN new_rows n ON n."id" = o."id"
        WHERE (o."status" = 'PUBLISHED' OR n."status" = 'PUBLISHED')
          AND (o."status" IS DISTINCT FROM n."status"
            OR o."title" IS DISTINCT FROM n."title"
            OR o."passingScore" IS DISTINCT FROM n."passingScore");
    END IF;
    RETURN NULL;
END;
$$;

-- AssessmentQuestion / AssessmentAsset: content of the PUBLISHED assessment.
CREATE FUNCTION mobile_sync_change_assessment_child() RETURNS trigger LANGUAGE plpgsql AS $$
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
    PERFORM mobile_sync_emit_assessments(array_agg("id"), ARRAY['content'])
    FROM "Assessment" WHERE "id" = ANY (assessment_ids) AND "status" = 'PUBLISHED';
    RETURN NULL;
END;
$$;

-- AssessmentOption: content of the PUBLISHED assessment via the question.
CREATE FUNCTION mobile_sync_change_assessment_option() RETURNS trigger LANGUAGE plpgsql AS $$
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
    PERFORM mobile_sync_emit_assessments(array_agg(DISTINCT assessment."id"), ARRAY['content'])
    FROM "AssessmentQuestion" question
    JOIN "Assessment" assessment ON assessment."id" = question."assessmentId"
    WHERE question."id" = ANY (question_ids) AND assessment."status" = 'PUBLISHED';
    RETURN NULL;
END;
$$;

-- VocabularySet: content on UPDATE/DELETE; structure too when the title changed.
CREATE FUNCTION mobile_sync_change_vocabulary_set() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM mobile_sync_emit_vocabulary_sets(array_agg("id"), ARRAY['content']) FROM new_rows;
        PERFORM mobile_sync_emit_vocabulary_sets(array_agg(n."id"), ARRAY['structure'])
        FROM old_rows o JOIN new_rows n ON n."id" = o."id"
        WHERE o."title" IS DISTINCT FROM n."title";
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM mobile_sync_emit_vocabulary_sets(array_agg("id"), ARRAY['content']) FROM old_rows;
    END IF;
    RETURN NULL;
END;
$$;

-- VocabularyEntry: content of its set.
CREATE FUNCTION mobile_sync_change_vocabulary_entry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    set_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "vocabularySetId") INTO set_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "vocabularySetId") INTO set_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "vocabularySetId") INTO set_ids
        FROM (SELECT "vocabularySetId" FROM old_rows UNION ALL SELECT "vocabularySetId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit_vocabulary_sets(set_ids, ARRAY['content']);
    RETURN NULL;
END;
$$;

-- PdfBook: content (entity pdfBook) on UPDATE/DELETE via linked pages.
CREATE FUNCTION mobile_sync_change_pdf_book() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM mobile_sync_emit_pdf_books(array_agg("id")) FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM mobile_sync_emit_pdf_books(array_agg("id")) FROM old_rows;
    END IF;
    RETURN NULL;
END;
$$;

-- PdfBookPage: content (entity pdfBook) on UPDATE/DELETE via the page asset.
CREATE FUNCTION mobile_sync_change_pdf_book_page() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM mobile_sync_emit_materials(
            array_agg(link."materialId"), ARRAY['content'], 'pdfBook', array_agg(page."bookId"))
        FROM new_rows page JOIN "MaterialAsset" link ON link."assetId" = page."assetId";
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM mobile_sync_emit_materials(
            array_agg(link."materialId"), ARRAY['content'], 'pdfBook', array_agg(page."bookId"))
        FROM old_rows page JOIN "MaterialAsset" link ON link."assetId" = page."assetId";
    END IF;
    RETURN NULL;
END;
$$;

-- CohortMeeting: roster of the cohort's course.
CREATE FUNCTION mobile_sync_change_cohort_meeting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    cohort_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "cohortId") INTO cohort_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "cohortId") INTO cohort_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "cohortId") INTO cohort_ids
        FROM (SELECT "cohortId" FROM old_rows UNION ALL SELECT "cohortId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit('course', array_agg(DISTINCT "courseId"), ARRAY['roster'])
    FROM "Cohort" WHERE "id" = ANY (cohort_ids);
    RETURN NULL;
END;
$$;

-- CohortStaff: roster of the cohort's course + state of the staff member.
CREATE FUNCTION mobile_sync_change_cohort_staff() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    cohort_ids TEXT[];
    member_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "cohortId"), array_agg(DISTINCT "organizationMemberId")
        INTO cohort_ids, member_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "cohortId"), array_agg(DISTINCT "organizationMemberId")
        INTO cohort_ids, member_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "cohortId"), array_agg(DISTINCT "organizationMemberId")
        INTO cohort_ids, member_ids
        FROM (SELECT "cohortId", "organizationMemberId" FROM old_rows
              UNION ALL SELECT "cohortId", "organizationMemberId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit('course', array_agg(DISTINCT "courseId"), ARRAY['roster'])
    FROM "Cohort" WHERE "id" = ANY (cohort_ids);
    PERFORM mobile_sync_emit('user', array_agg(DISTINCT "userId"), ARRAY['state'])
    FROM "OrganizationMember" WHERE "id" = ANY (member_ids);
    RETURN NULL;
END;
$$;

-- AssessmentEvent: roster of the course when the event is or was visible
-- (status other than DRAFT).
CREATE FUNCTION mobile_sync_change_assessment_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    course_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "courseId") INTO course_ids FROM new_rows WHERE "status" <> 'DRAFT';
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "courseId") INTO course_ids FROM old_rows WHERE "status" <> 'DRAFT';
    ELSE
        SELECT array_agg(DISTINCT id) INTO course_ids
        FROM (SELECT o."courseId" AS id FROM old_rows o JOIN new_rows n ON n."id" = o."id"
              WHERE o."status" <> 'DRAFT' OR n."status" <> 'DRAFT'
              UNION ALL
              SELECT n."courseId" FROM old_rows o JOIN new_rows n ON n."id" = o."id"
              WHERE o."status" <> 'DRAFT' OR n."status" <> 'DRAFT') changed;
    END IF;
    PERFORM mobile_sync_emit('course', course_ids, ARRAY['roster']);
    RETURN NULL;
END;
$$;

-- CourseCollaborator: state of the member's user.
CREATE FUNCTION mobile_sync_change_course_collaborator() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    member_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "organizationMemberId") INTO member_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "organizationMemberId") INTO member_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "organizationMemberId") INTO member_ids
        FROM (SELECT "organizationMemberId" FROM old_rows
              UNION ALL SELECT "organizationMemberId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit('user', array_agg(DISTINCT "userId"), ARRAY['state'])
    FROM "OrganizationMember" WHERE "id" = ANY (member_ids);
    RETURN NULL;
END;
$$;

-- AssessmentAnswer: state of the attempt's user.
CREATE FUNCTION mobile_sync_change_assessment_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    attempt_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "attemptId") INTO attempt_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "attemptId") INTO attempt_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "attemptId") INTO attempt_ids
        FROM (SELECT "attemptId" FROM old_rows UNION ALL SELECT "attemptId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit('user', array_agg(DISTINCT "userId"), ARRAY['state'])
    FROM "AssessmentAttempt" WHERE "id" = ANY (attempt_ids);
    RETURN NULL;
END;
$$;

-- AssessmentAnswerSelection: state of the attempt's user via the answer.
CREATE FUNCTION mobile_sync_change_assessment_answer_selection() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    answer_ids TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT array_agg(DISTINCT "answerId") INTO answer_ids FROM new_rows;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT "answerId") INTO answer_ids FROM old_rows;
    ELSE
        SELECT array_agg(DISTINCT "answerId") INTO answer_ids
        FROM (SELECT "answerId" FROM old_rows UNION ALL SELECT "answerId" FROM new_rows) changed;
    END IF;
    PERFORM mobile_sync_emit('user', array_agg(DISTINCT attempt."userId"), ARRAY['state'])
    FROM "AssessmentAnswer" answer
    JOIN "AssessmentAttempt" attempt ON attempt."id" = answer."attemptId"
    WHERE answer."id" = ANY (answer_ids);
    RETURN NULL;
END;
$$;

-------------------------------------------------------------------------------
-- Trigger wiring.
-------------------------------------------------------------------------------

DO $$
DECLARE
    spec RECORD;
    events TEXT[];
    event TEXT;
BEGIN
    FOR spec IN
        SELECT * FROM (VALUES
            -- table, function, args, events
            ('Organization', 'mobile_sync_change_column', $a$'organization', 'meta', 'id'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('Course', 'mobile_sync_change_course', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CourseModule', 'mobile_sync_change_course_module', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CourseItem', 'mobile_sync_change_course_item', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('Material', 'mobile_sync_change_material', '', ARRAY['UPDATE', 'DELETE']),
            ('MaterialRequirement', 'mobile_sync_change_material_child', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('MaterialAsset', 'mobile_sync_change_material_child', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('Asset', 'mobile_sync_change_asset', '', ARRAY['UPDATE']),
            ('Assessment', 'mobile_sync_change_assessment', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentQuestion', 'mobile_sync_change_assessment_child', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentAsset', 'mobile_sync_change_assessment_child', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentOption', 'mobile_sync_change_assessment_option', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('VocabularySet', 'mobile_sync_change_vocabulary_set', '', ARRAY['UPDATE', 'DELETE']),
            ('VocabularyEntry', 'mobile_sync_change_vocabulary_entry', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('PdfBook', 'mobile_sync_change_pdf_book', '', ARRAY['UPDATE', 'DELETE']),
            ('PdfBookPage', 'mobile_sync_change_pdf_book_page', '', ARRAY['UPDATE', 'DELETE']),
            ('Cohort', 'mobile_sync_change_column', $a$'course', 'roster', 'courseId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CohortMeeting', 'mobile_sync_change_cohort_meeting', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CohortStaff', 'mobile_sync_change_cohort_staff', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentEvent', 'mobile_sync_change_assessment_event', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CourseCollaborator', 'mobile_sync_change_course_collaborator', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('OrganizationMember', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CourseEnrollment', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('CohortEnrollment', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('ContentProgress', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('UserActivityEvent', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('UserGamification', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('UserAchievement', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentAttempt', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentEventParticipant', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('VocabularyProgress', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('VocabularyPracticeAttempt', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('learnerSidebarSeen', 'mobile_sync_change_column', $a$'user', 'state', 'userId'$a$, ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentAnswer', 'mobile_sync_change_assessment_answer', '', ARRAY['INSERT', 'UPDATE', 'DELETE']),
            ('AssessmentAnswerSelection', 'mobile_sync_change_assessment_answer_selection', '', ARRAY['INSERT', 'UPDATE', 'DELETE'])
        ) AS t(table_name, function_name, args, events)
    LOOP
        FOREACH event IN ARRAY spec.events LOOP
            EXECUTE format(
                'CREATE TRIGGER %I AFTER %s ON %I REFERENCING %s FOR EACH STATEMENT EXECUTE FUNCTION %I(%s)',
                'mobile_sync_change_' || lower(event),
                event,
                spec.table_name,
                CASE event
                    WHEN 'INSERT' THEN 'NEW TABLE AS new_rows'
                    WHEN 'DELETE' THEN 'OLD TABLE AS old_rows'
                    ELSE 'OLD TABLE AS old_rows NEW TABLE AS new_rows'
                END,
                spec.function_name,
                spec.args);
        END LOOP;
    END LOOP;
END;
$$;
