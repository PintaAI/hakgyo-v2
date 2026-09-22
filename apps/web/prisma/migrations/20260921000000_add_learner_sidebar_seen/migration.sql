CREATE TABLE "learnerSidebarSeen" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "indicatorKey" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learnerSidebarSeen_pkey" PRIMARY KEY ("userId", "organizationId", "indicatorKey")
);

CREATE INDEX "learnerSidebarSeen_userId_organizationId_seenAt_idx"
ON "learnerSidebarSeen"("userId", "organizationId", "seenAt");

ALTER TABLE "learnerSidebarSeen"
ADD CONSTRAINT "learnerSidebarSeen_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learnerSidebarSeen"
ADD CONSTRAINT "learnerSidebarSeen_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
