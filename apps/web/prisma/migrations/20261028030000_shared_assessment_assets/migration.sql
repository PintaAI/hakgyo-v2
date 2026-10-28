-- Step 3 of shared assets (docs/eps-question-generator.md section 3.1): the asset relation moves to
-- "assetOrganizationId", so an assessment may link a shared Hakgyo asset.
ALTER TABLE "AssessmentAsset" DROP CONSTRAINT "AssessmentAsset_asset_owner_check";

-- DropForeignKey
ALTER TABLE "AssessmentAsset" DROP CONSTRAINT "AssessmentAsset_assetId_organizationId_fkey";

-- AlterTable
ALTER TABLE "AssessmentAsset" ALTER COLUMN "assetOrganizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "AssessmentAsset" ADD CONSTRAINT "AssessmentAsset_assetId_assetOrganizationId_fkey" FOREIGN KEY ("assetId", "assetOrganizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Another organization's asset only when Hakgyo shared it. Runs after the trigger that fills the
-- owner (triggers fire in name order).
CREATE FUNCTION assessment_asset_shared_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."assetOrganizationId" <> NEW."organizationId" AND NOT EXISTS (
        SELECT 1 FROM "Asset" WHERE "id" = NEW."assetId" AND "sharedAt" IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Asset % is not shared', NEW."assetId" USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_asset_shared_only BEFORE INSERT OR UPDATE ON "AssessmentAsset"
    FOR EACH ROW EXECUTE FUNCTION assessment_asset_shared_only();
