CREATE TABLE "AssessmentAsset" (
    "assessmentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AssessmentAsset_pkey" PRIMARY KEY ("assessmentId","assetId")
);

CREATE INDEX "AssessmentAsset_assetId_idx" ON "AssessmentAsset"("assetId");

ALTER TABLE "AssessmentAsset" ADD CONSTRAINT "AssessmentAsset_assessmentId_organizationId_fkey"
FOREIGN KEY ("assessmentId", "organizationId") REFERENCES "Assessment"("id", "organizationId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentAsset" ADD CONSTRAINT "AssessmentAsset_assetId_organizationId_fkey"
FOREIGN KEY ("assetId", "organizationId") REFERENCES "Asset"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
