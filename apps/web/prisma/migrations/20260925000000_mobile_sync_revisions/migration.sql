CREATE TABLE "MobileSyncRevision" (
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "MobileSyncRevision_pkey" PRIMARY KEY ("scopeType", "scopeId")
);

-- A revision is scoped to one organization or learner. Row-level writes make
-- changes from any server process visible without polling the dashboard.
CREATE FUNCTION bump_mobile_sync_revision() RETURNS trigger AS $$
DECLARE
    old_scope TEXT;
    new_scope TEXT;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        old_scope := to_jsonb(OLD)->>TG_ARGV[1];
    END IF;
    IF TG_OP <> 'DELETE' THEN
        new_scope := to_jsonb(NEW)->>TG_ARGV[1];
    END IF;

    IF old_scope IS NOT NULL THEN
        INSERT INTO "MobileSyncRevision" ("scopeType", "scopeId")
        VALUES (TG_ARGV[0], old_scope)
        ON CONFLICT ("scopeType", "scopeId") DO UPDATE
        SET "revision" = "MobileSyncRevision"."revision" + 1;
    END IF;
    IF new_scope IS NOT NULL AND new_scope IS DISTINCT FROM old_scope THEN
        INSERT INTO "MobileSyncRevision" ("scopeType", "scopeId")
        VALUES (TG_ARGV[0], new_scope)
        ON CONFLICT ("scopeType", "scopeId") DO UPDATE
        SET "revision" = "MobileSyncRevision"."revision" + 1;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Child rows lack a direct organization/user column.
CREATE FUNCTION bump_mobile_sync_related_revision() RETURNS trigger AS $$
DECLARE
    row_data JSONB;
    owner_id TEXT;
BEGIN
    row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    IF TG_TABLE_NAME = 'AssessmentQuestion' THEN
        SELECT "organizationId" INTO owner_id FROM "Assessment"
        WHERE "id" = row_data->>'assessmentId';
    ELSIF TG_TABLE_NAME = 'AssessmentOption' THEN
        SELECT assessment."organizationId" INTO owner_id
        FROM "AssessmentQuestion" question
        JOIN "Assessment" assessment ON assessment."id" = question."assessmentId"
        WHERE question."id" = row_data->>'questionId';
    ELSIF TG_TABLE_NAME = 'AssessmentAnswer' THEN
        SELECT "userId" INTO owner_id FROM "AssessmentAttempt"
        WHERE "id" = row_data->>'attemptId';
    ELSE
        SELECT attempt."userId" INTO owner_id
        FROM "AssessmentAnswer" answer
        JOIN "AssessmentAttempt" attempt ON attempt."id" = answer."attemptId"
        WHERE answer."id" = row_data->>'answerId';
    END IF;

    IF owner_id IS NOT NULL THEN
        INSERT INTO "MobileSyncRevision" ("scopeType", "scopeId")
        VALUES (CASE WHEN TG_TABLE_NAME IN ('AssessmentQuestion', 'AssessmentOption')
            THEN 'organization' ELSE 'user' END, owner_id)
        ON CONFLICT ("scopeType", "scopeId") DO UPDATE
        SET "revision" = "MobileSyncRevision"."revision" + 1;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'Organization', 'Course', 'Cohort', 'CohortMeeting',
        'CourseModule', 'CourseItem', 'Material', 'MaterialRequirement',
        'Assessment', 'VocabularySet', 'VocabularyEntry', 'AssessmentEvent',
        'Asset', 'AssessmentAsset', 'MaterialAsset', 'CohortStaff'
    ] LOOP
        EXECUTE format('CREATE TRIGGER mobile_sync_revision AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION bump_mobile_sync_revision(%L, %L)',
            table_name, 'organization', CASE WHEN table_name = 'Organization' THEN 'id' ELSE 'organizationId' END);
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY[
        'OrganizationMember', 'CourseEnrollment', 'CohortEnrollment',
        'ContentProgress', 'UserActivityEvent', 'UserGamification',
        'UserAchievement', 'AssessmentAttempt', 'AssessmentEventParticipant',
        'VocabularyProgress', 'VocabularyPracticeAttempt', 'learnerSidebarSeen'
    ] LOOP
        EXECUTE format('CREATE TRIGGER mobile_sync_revision AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION bump_mobile_sync_revision(%L, %L)',
            table_name, 'user', 'userId');
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY[
        'AssessmentQuestion', 'AssessmentOption', 'AssessmentAnswer',
        'AssessmentAnswerSelection'
    ] LOOP
        EXECUTE format('CREATE TRIGGER mobile_sync_related_revision AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION bump_mobile_sync_related_revision()', table_name);
    END LOOP;
END;
$$;
