-- CreateEnum
CREATE TYPE "GamificationAction" AS ENUM (
  'MATERIAL_COMPLETED',
  'ASSESSMENT_SUBMITTED',
  'ASSESSMENT_PASSED',
  'VOCABULARY_REVIEWED'
);

-- CreateTable
CREATE TABLE "UserActivityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" "GamificationAction" NOT NULL,
  "xpAwarded" INTEGER NOT NULL,
  "contributesToStreak" BOOLEAN NOT NULL,
  "activityDate" DATE NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,

  CONSTRAINT "UserActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGamification" (
  "userId" TEXT NOT NULL,
  "totalXp" INTEGER NOT NULL DEFAULT 0,
  "completedActivities" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastActivityDate" DATE,
  "timeZone" TEXT NOT NULL DEFAULT 'UTC',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserGamification_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserActivityEvent_idempotencyKey_key" ON "UserActivityEvent"("idempotencyKey");
CREATE INDEX "UserActivityEvent_userId_occurredAt_idx" ON "UserActivityEvent"("userId", "occurredAt");
CREATE INDEX "UserActivityEvent_userId_activityDate_idx" ON "UserActivityEvent"("userId", "activityDate");
CREATE INDEX "UserActivityEvent_userId_action_occurredAt_idx" ON "UserActivityEvent"("userId", "action", "occurredAt");
CREATE UNIQUE INDEX "UserAchievement_userId_code_key" ON "UserAchievement"("userId", "code");
CREATE INDEX "UserAchievement_userId_earnedAt_idx" ON "UserAchievement"("userId", "earnedAt");

-- AddForeignKey
ALTER TABLE "UserActivityEvent"
ADD CONSTRAINT "UserActivityEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGamification"
ADD CONSTRAINT "UserGamification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAchievement"
ADD CONSTRAINT "UserAchievement_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
