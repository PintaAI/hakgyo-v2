-- Section changes (title, instructions, timers, rules) are assessment content: tell mobile
-- clients like question changes do, through the same statement-level trigger function.
CREATE TRIGGER mobile_sync_change_insert AFTER INSERT ON "AssessmentSection"
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION mobile_sync_change_assessment_child();
CREATE TRIGGER mobile_sync_change_update AFTER UPDATE ON "AssessmentSection"
    REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION mobile_sync_change_assessment_child();
CREATE TRIGGER mobile_sync_change_delete AFTER DELETE ON "AssessmentSection"
    REFERENCING OLD TABLE AS old_rows
    FOR EACH STATEMENT EXECUTE FUNCTION mobile_sync_change_assessment_child();

-- Positions are never negative, like question positions.
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_position_check" CHECK ("position" >= 0);
