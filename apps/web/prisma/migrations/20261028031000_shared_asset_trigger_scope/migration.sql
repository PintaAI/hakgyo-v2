-- Check shared assets only when a link is made or repointed, so unrelated updates (cascades,
-- maintenance) of an existing link never fail after Hakgyo stops sharing its asset.
DROP TRIGGER assessment_asset_shared_only ON "AssessmentAsset";
CREATE TRIGGER assessment_asset_shared_only BEFORE INSERT OR UPDATE OF "assetId", "assetOrganizationId" ON "AssessmentAsset"
    FOR EACH ROW EXECUTE FUNCTION assessment_asset_shared_only();
