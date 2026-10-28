-- AlterTable
ALTER TABLE "AssessmentAsset" ADD COLUMN     "assetOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "sharedAt" TIMESTAMP(3);


-- Existing links reference their own organization's assets.
UPDATE "AssessmentAsset" SET "assetOrganizationId" = "organizationId" WHERE "assetOrganizationId" IS NULL;
