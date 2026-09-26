-- Replace the row-level mobile sync triggers with statement-level triggers.
--
-- The row-level version serialized every changed row with to_jsonb (including
-- large JSON columns such as Material.content) and upserted the hot
-- MobileSyncRevision row once per changed row. These triggers read only the
-- scope column from the statement's transition tables and bump each distinct
-- scope once per statement, in scope order so concurrent multi-scope bumps
-- lock rows in a consistent order.
--
-- Scope semantics are unchanged:
-- * Direct tables bump the OLD scope (UPDATE/DELETE) and the NEW scope
--   (INSERT/UPDATE) for their organization or user column.
-- * Child tables resolve their owner through the parent rows, using the NEW
--   row for INSERT/UPDATE and the OLD row for DELETE.
-- Revisions are opaque change markers, so one bump per statement instead of
-- one per row does not change what clients observe.
--
-- PostgreSQL requires one trigger per event when transition tables are used.

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
        EXECUTE format('DROP TRIGGER mobile_sync_revision ON %I', table_name);
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY[
        'AssessmentQuestion', 'AssessmentOption', 'AssessmentAnswer',
        'AssessmentAnswerSelection'
    ] LOOP
        EXECUTE format('DROP TRIGGER mobile_sync_related_revision ON %I', table_name);
    END LOOP;
END;
$$;

DROP FUNCTION bump_mobile_sync_revision();
DROP FUNCTION bump_mobile_sync_related_revision();

-- TG_ARGV[0] is the scope type; TG_ARGV[1] is the scope column.
CREATE FUNCTION bump_mobile_sync_revision() RETURNS trigger AS $$
DECLARE
    scopes TEXT;
BEGIN
    scopes := CASE TG_OP
        WHEN 'INSERT' THEN format('SELECT %I AS scope_id FROM new_rows', TG_ARGV[1])
        WHEN 'DELETE' THEN format('SELECT %I AS scope_id FROM old_rows', TG_ARGV[1])
        ELSE format(
            'SELECT %1$I AS scope_id FROM old_rows UNION ALL SELECT %1$I FROM new_rows',
            TG_ARGV[1])
    END;

    EXECUTE format(
        'INSERT INTO "MobileSyncRevision" ("scopeType", "scopeId")
        SELECT $1, scope_id
        FROM (SELECT DISTINCT scope_id FROM (%s) changed WHERE scope_id IS NOT NULL) scopes
        ORDER BY scope_id
        ON CONFLICT ("scopeType", "scopeId") DO UPDATE
        SET "revision" = "MobileSyncRevision"."revision" + 1',
        scopes)
    USING TG_ARGV[0];
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Child rows lack a direct organization/user column.
CREATE FUNCTION bump_mobile_sync_related_revision() RETURNS trigger AS $$
DECLARE
    changed_rows TEXT := CASE WHEN TG_OP = 'DELETE' THEN 'old_rows' ELSE 'new_rows' END;
    scope_type TEXT;
    scopes TEXT;
BEGIN
    IF TG_TABLE_NAME = 'AssessmentQuestion' THEN
        scope_type := 'organization';
        scopes := format(
            'SELECT assessment."organizationId" AS scope_id
            FROM %I changed
            JOIN "Assessment" assessment ON assessment."id" = changed."assessmentId"',
            changed_rows);
    ELSIF TG_TABLE_NAME = 'AssessmentOption' THEN
        scope_type := 'organization';
        scopes := format(
            'SELECT assessment."organizationId" AS scope_id
            FROM %I changed
            JOIN "AssessmentQuestion" question ON question."id" = changed."questionId"
            JOIN "Assessment" assessment ON assessment."id" = question."assessmentId"',
            changed_rows);
    ELSIF TG_TABLE_NAME = 'AssessmentAnswer' THEN
        scope_type := 'user';
        scopes := format(
            'SELECT attempt."userId" AS scope_id
            FROM %I changed
            JOIN "AssessmentAttempt" attempt ON attempt."id" = changed."attemptId"',
            changed_rows);
    ELSE
        scope_type := 'user';
        scopes := format(
            'SELECT attempt."userId" AS scope_id
            FROM %I changed
            JOIN "AssessmentAnswer" answer ON answer."id" = changed."answerId"
            JOIN "AssessmentAttempt" attempt ON attempt."id" = answer."attemptId"',
            changed_rows);
    END IF;

    EXECUTE format(
        'INSERT INTO "MobileSyncRevision" ("scopeType", "scopeId")
        SELECT $1, scope_id
        FROM (SELECT DISTINCT scope_id FROM (%s) changed_scopes WHERE scope_id IS NOT NULL) scopes
        ORDER BY scope_id
        ON CONFLICT ("scopeType", "scopeId") DO UPDATE
        SET "revision" = "MobileSyncRevision"."revision" + 1',
        scopes)
    USING scope_type;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
    scope_type TEXT;
    scope_column TEXT;
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
        IF table_name IN (
            'OrganizationMember', 'CourseEnrollment', 'CohortEnrollment',
            'ContentProgress', 'UserActivityEvent', 'UserGamification',
            'UserAchievement', 'AssessmentAttempt', 'AssessmentEventParticipant',
            'VocabularyProgress', 'VocabularyPracticeAttempt', 'learnerSidebarSeen'
        ) THEN
            scope_type := 'user';
            scope_column := 'userId';
        ELSE
            scope_type := 'organization';
            scope_column := CASE WHEN table_name = 'Organization' THEN 'id' ELSE 'organizationId' END;
        END IF;

        EXECUTE format('CREATE TRIGGER mobile_sync_revision_insert AFTER INSERT ON %I REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION bump_mobile_sync_revision(%L, %L)',
            table_name, scope_type, scope_column);
        EXECUTE format('CREATE TRIGGER mobile_sync_revision_update AFTER UPDATE ON %I REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION bump_mobile_sync_revision(%L, %L)',
            table_name, scope_type, scope_column);
        EXECUTE format('CREATE TRIGGER mobile_sync_revision_delete AFTER DELETE ON %I REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION bump_mobile_sync_revision(%L, %L)',
            table_name, scope_type, scope_column);
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY[
        'AssessmentQuestion', 'AssessmentOption', 'AssessmentAnswer',
        'AssessmentAnswerSelection'
    ] LOOP
        EXECUTE format('CREATE TRIGGER mobile_sync_related_revision_insert AFTER INSERT ON %I REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION bump_mobile_sync_related_revision()', table_name);
        EXECUTE format('CREATE TRIGGER mobile_sync_related_revision_update AFTER UPDATE ON %I REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION bump_mobile_sync_related_revision()', table_name);
        EXECUTE format('CREATE TRIGGER mobile_sync_related_revision_delete AFTER DELETE ON %I REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION bump_mobile_sync_related_revision()', table_name);
    END LOOP;
END;
$$;
