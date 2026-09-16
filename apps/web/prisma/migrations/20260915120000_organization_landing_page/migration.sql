CREATE TABLE "OrganizationLandingPage" (
    "organizationId" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationLandingPage_pkey" PRIMARY KEY ("organizationId")
);
ALTER TABLE "OrganizationLandingPage" ADD CONSTRAINT "OrganizationLandingPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
