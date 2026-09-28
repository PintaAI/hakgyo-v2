-- Additive only: the legacy JSON columns stay until the HTML landing rollout is deployed.
CREATE TYPE "LandingRevisionSource" AS ENUM ('MCP', 'EDITOR', 'RESTORE');

ALTER TABLE "OrganizationLandingPage"
    ALTER COLUMN "draft" DROP NOT NULL,
    ADD COLUMN "draftHtml" TEXT,
    ADD COLUMN "draftRevisionId" TEXT,
    ADD COLUMN "publishedHtml" TEXT,
    ADD COLUMN "publishedRevisionId" TEXT,
    ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "OrganizationLandingRevision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "source" "LandingRevisionSource" NOT NULL,
    "summary" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationLandingRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationLandingRevision_organizationId_createdAt_idx" ON "OrganizationLandingRevision"("organizationId", "createdAt");
CREATE INDEX "OrganizationLandingRevision_createdByUserId_idx" ON "OrganizationLandingRevision"("createdByUserId");

ALTER TABLE "OrganizationLandingRevision" ADD CONSTRAINT "OrganizationLandingRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationLandingPage"("organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationLandingRevision" ADD CONSTRAINT "OrganizationLandingRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
