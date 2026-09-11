-- Backfill: these tables were first created in the dev database via direct
-- DDL. This migration replays the same statements for fresh environments
-- (CI, production `migrate deploy`). On databases where the tables already
-- exist, mark applied with `prisma migrate resolve --applied` instead.
CREATE TABLE "pushTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "endpoint" TEXT,
    "p256dh" TEXT,
    "auth" TEXT,
    "expoPushToken" TEXT,
    "deviceName" TEXT,
    "os" TEXT,
    "appVersion" TEXT,
    "userAgent" TEXT,
    "disabledAt" TIMESTAMP(3),
    "disabledReason" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDeliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pushTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "path" TEXT,
    "mobilePath" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pushTarget_endpoint_key" ON "pushTarget"("endpoint");
CREATE UNIQUE INDEX "pushTarget_expoPushToken_key" ON "pushTarget"("expoPushToken");
CREATE UNIQUE INDEX "pushTarget_userId_deviceId_key" ON "pushTarget"("userId", "deviceId");
CREATE INDEX "pushTarget_userId_disabledAt_idx" ON "pushTarget"("userId", "disabledAt");
CREATE INDEX "notification_userId_readAt_createdAt_idx" ON "notification"("userId", "readAt", "createdAt");

ALTER TABLE "pushTarget" ADD CONSTRAINT "pushTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
