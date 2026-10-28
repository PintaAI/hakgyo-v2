-- Until the asset relation moves to "assetOrganizationId" (docs/eps-question-generator.md
-- section 3.1), every writer gets the owner filled in, so code deployed before it (or raw inserts)
-- cannot leave it empty, and it must match the organization the foreign key enforces.
CREATE FUNCTION assessment_asset_default_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."assetOrganizationId" IS NULL THEN
        NEW."assetOrganizationId" := NEW."organizationId";
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_asset_default_owner BEFORE INSERT OR UPDATE ON "AssessmentAsset"
    FOR EACH ROW EXECUTE FUNCTION assessment_asset_default_owner();

-- Rows written between the backfill and this trigger.
UPDATE "AssessmentAsset" SET "assetOrganizationId" = "organizationId" WHERE "assetOrganizationId" IS NULL;

ALTER TABLE "AssessmentAsset" ADD CONSTRAINT "AssessmentAsset_asset_owner_check"
    CHECK ("assetOrganizationId" = "organizationId");

-- Only Hakgyo's own assets can be shared with other organizations.
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_shared_by_hakgyo_check"
    CHECK ("sharedAt" IS NULL OR "organizationId" = 'hakgyo-system-organization');
