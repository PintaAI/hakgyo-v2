CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "MeetingProvider" AS ENUM ('ZOOM', 'GOOGLE_MEET');

ALTER TABLE "Organization" ADD COLUMN "meetingProvider" "MeetingProvider" NOT NULL DEFAULT 'ZOOM';

CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectedByMembershipId" TEXT NOT NULL,
    "googleUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_organizationId_key" ON "GoogleCalendarConnection"("organizationId");
CREATE INDEX "GoogleCalendarConnection_connectedByMembershipId_idx" ON "GoogleCalendarConnection"("connectedByMembershipId");
CREATE INDEX "GoogleCalendarConnection_googleUserId_idx" ON "GoogleCalendarConnection"("googleUserId");

ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_creator_fkey" FOREIGN KEY ("connectedByMembershipId","organizationId") REFERENCES "OrganizationMember"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CohortMeeting" ADD COLUMN "provider" "MeetingProvider" NOT NULL DEFAULT 'ZOOM';
ALTER TABLE "CohortMeeting" ADD COLUMN "googleCalendarId" TEXT;
ALTER TABLE "CohortMeeting" ADD COLUMN "googleCalendarEventId" TEXT;
ALTER TABLE "CohortMeeting" ADD COLUMN "moduleId" TEXT;
CREATE UNIQUE INDEX "CohortMeeting_googleEvent_key" ON "CohortMeeting"("organizationId","googleCalendarId","googleCalendarEventId");
CREATE INDEX "CohortMeeting_moduleId_idx" ON "CohortMeeting"("moduleId");
ALTER TABLE "CohortMeeting" ADD CONSTRAINT "CohortMeeting_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
